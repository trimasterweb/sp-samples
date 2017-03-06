var LIST_Documentos = {
	library: {
		title: "Documentos",
		Path: "/Documents"
	},
	pedidos: {
		listName: "Pedido de Guarda"
	},
	els: {
		btnSave: "#Salvar",
		pedido: "#PedidoGuarda",
		descricao: "[id*='Descricao']",
		filePath: "#filePath",
		nivel3: '#Nivel3'
	},
	niveis: [
		{ element: '#Nivel1' , listName: 'Nivel1', customFilter: '', GUID: null },
		{ element: '#Nivel2' , listName: 'Nivel2', customFilter: '', GUID: null },
		// -- alterado para campo texto { element: '#Nivel3' , listName: 'Nivel3', customFilter: '', GUID: null },
		{ element: '#Nivel4' , listName: 'Nivel4', customFilter: '', GUID: null },
		{ element: '#Nivel5' , listName: 'Nivel5', customFilter: '', GUID: null },
		{ element: '#Nivel6' , listName: 'Nivel6', customFilter: '', GUID: null }
	],
	init: function() {
		var ID = $pnp.util.getUrlParamByName("ID");		
		
		$pnp.sp.web.lists.getByTitle(this.pedidos.listName).get()
			.then(this.loadPedido.bind(this))
			.catch(this.handleErrors);
			
		$(this.els.btnSave).on('click', this.save.bind(this));
	},
	gedProtocoloUrl: function () {
		var pedidoQs = decodeURIComponent(window.location.search).split('Pedido=');
		pedidoQs = pedidoQs.length > 1 ? pedidoQs[1] : '';  
		return $pnp.util.getUrlParamByName("Pedido") || pedidoQs;
	},	
	loadPedido: function (d) {
		var protocolo = this.gedProtocoloUrl() || $('#PedidoGuardaID').text(),
			filterAuto = "substringof('Não',TemDocumento )";

		if ($.trim(protocolo)) {
			$(this.els.pedido).attr('disabled', 'disabled').val(protocolo);
			this.getPedido(0, protocolo)
				.then(this.applyGetPedido.bind(this))
				.then(this.switchNiveis.bind(this));
		} else {
			this.applyAutoComplete({ 
				element: this.els.pedido, 
				GUID: d.Id, 
				listName: this.pedidos.ListName, 
				callback: this.applyGetPedido.bind(this), 
				customFilter: filterAuto
			});
		}
	},
	setNiveisFields: function (pedido) {
		this.niveis.forEach(function (n) {
			var data = pedido[n.listName],
				el = $(n.element);
			if(data) {
				el.val(data.Title || '');
				el.attr('lookup-id', data.Id || '')
			}
		});
	},
	setPedidoInfo: function (pedido) {
		['Observacao', 'Nivel3'].forEach(function (n) {
			var data = pedido[n],
				el = $('[id*="' + n + '"]');

			if(data) {
				if(el.is('textarea'))
					el.text(data|| '');	
				else
					el.val(data|| '');
			}
		});
	},
	getPedido: function (id, title) {
		var expandFields = this.niveis.map(function (p) { return p.listName+ '/Title' + ',' + p.listName+ '/Id'; })
			selectFields = ['*'].concat(expandFields);
			
		return $pnp.sp.web.lists.getByTitle(this.pedidos.listName).items
			.filter("ID eq "+ id +" or Title eq '"+ title + "'")
			.select(selectFields)
			.expand(expandFields).get();
	},
	applyGetPedido: function (pedido) {
		pedido = $pnp.util.isArray(pedido) ? pedido[0] : pedido;
		$(this.els.pedido).attr('lookup-id', pedido.Id);
		this.setNiveisFields(pedido);
		this.setPedidoInfo(pedido);
		$('#filePath a').html(this.getFileName());
	},
	getFileName: function () {
		return [$(this.els.nivel3).val() || '', $pnp.util.getUrlParamByName("ID")].join('_');
	},
	getFormValues: function () {
		var response = {
				Title: this.getFileName(),
				FileLeafRef: this.getFileName(),
				Descricao: $(this.els.descricao).text(),
				Nivel3: $(this.els.nivel3).val(),
				PedidoGuardaId: $(this.els.pedido).attr('lookup-id')
			};
			
		this.niveis.forEach(function (n) {
			response[n.listName + 'Id'] = $(n.element).attr('lookup-id');
		}.bind(this));
			
		return response;
	},
	save: function () {
		this.loading = this.showLoading({title: 'Salvando...'});
		var	docFields = this.getFormValues.bind(this)(),
			pedidoFields = {
				TemDocumento: 'Sim',
				Status: 'Concluído'
			};
						
		if(docFields.PedidoGuardaId) {
			this.saveDocument($pnp.util.getUrlParamByName("ID"), docFields)
				.then(this.updatePedido.bind(this, docFields.PedidoGuardaId, pedidoFields))
				.then(this.applySave.bind(this))
				.catch(this.handleErrors);
		} else {
			alert('Preencha um pedido para prosseguir!');
			this.hideLoading(this.loading);
		}
	},
	saveDocument : function (id, values) {
		return $pnp.sp.web.lists.getByTitle(this.library.title).items.getById(id).update(values);	
	},
	updatePedido: function (id, values) {
		return $pnp.sp.web.lists.getByTitle(this.pedidos.listName).items.getById(id).update(values)
	},
	applySave: function () {
		var filePath = $(this.els.filePath).find('a').attr('href');	
		
		alert("Arquivo salvo e publicado com sucesso.");
		
		this.hideLoading();
		
		if (!$pnp.util.getUrlParamByName("IsDlg")) {
			window.location = _spPageContextInfo.siteAbsoluteUrl;
		} else {
    		SP.UI.ModalDialog.commonModalDialogClose(SP.UI.DialogResult.OK, null);
    	}
	},
	applyAutoComplete: function (props) {
		// props:  { element, listName, customFilter, callback }
		//default values
		var self = this;
		props.field || (props.field = 'Title');
		return $(props.element).autocomplete({
			source: function (request, response) {
				var matcher = new RegExp( $.ui.autocomplete.escapeRegex( request.term ), "i" ),
					filter = " substringof('"+ encodeURIComponent(this.normalizeStr(request.term)) +"',"+ props.field  +")" + 
						(props.customFilter ? ' and ' + props.customFilter : ''),
					self = this;
				
				$pnp.sp.web.lists.getById(props.GUID).items
					.filter(filter)
					.select(this.getSelectFields())
					.expand(this.getExpandFields())
					.get()					
					.then(applyRequest.bind(this), this.handleErrors);
				
				function mapResults (d) { 
					return {'label': d[props.field], 'value': d[props.field],'id': d.ID.toString(), 'data': d}; 
				}
				function applyRequest (data) {
					response(data.map(mapResults));
				}
			}.bind(this),
			minLength: 1,
			change: function(event, ui){
				var lookupId = ui.item ? ui.item.id || '' : '';
				$(this).attr('lookup-id', lookupId);
				(props.callback  && ui.item ? props.callback(ui.item.data) : null);
				$(this).val((ui.item ? ui.item.value : ""));
				self.switchNiveis();
			}
		});
	},  
	getExpandFields: function () {
		return this.niveis.map(function (p) { return p.listName+ '/Title' + ',' + p.listName+ '/Id'; })
	},
	getSelectFields: function () {
		return [
			'Title',
			'ID',
			'Data',
			'Nivel3',
			'Observacao',
			'Digitalizacao',
			'Status',
			'SerieDocumental'
		].concat(this.getExpandFields());

	},
	normalizeStr:  function( term ) {
		var ret = "",
			accentMap = {"á": "a", "ö": "o", "ã": "a" };
		for ( var i = 0; i < term.length; i++ ) {
			ret += accentMap[ term.charAt(i) ] || term.charAt(i);
		}
		return ret;
    },
    handleErrors: function (e) {
		alert('Ocorreu um erro. Por favor contate o administrador do sistema.')
		if (window.console) {
			console.error(e);
		}
	},
	showLoading: function (props){
		return waitDialog = SP.UI.ModalDialog.showWaitScreenWithNoClose( IsEmpty(props) ? "Carregando..." : props.title, 
		IsEmpty(props) ? "Por favor aguarde..." : props.desc, 120, 400);
	},
	hideLoading: function (obj){
		(obj || this.loading).close(SP.UI.DialogResult.OK);  
	},
	
	// CCAB Exclusive
	initCCAB: function (){
		this.applyNiveisEvents();
	},
	$getAreaInput: function (){
		return $("#Nivel1");
	},
	$getAreaRow: function (){
		return this.$getAreaInput().closest('tr');
	},
	$getPaisRow: function (){
		return $("#Nivel4").closest('tr');
	},
	$getNCMRow: function (){
		return $("#Nivel5").closest('tr');
	},
	$getEventoRow: function (){
		return $("#Nivel6").closest('tr');
	},
	applyNiveisEvents: function (){
		var self = this;
		this.$getAreaRow().on( "autocompletechange", this.switchNiveis.bind(this));
		
		this.switchNiveis();
	},
	switchNiveis: function () {
		var area = (this.$getAreaInput().val() || '').toLowerCase();
		
		this.$getPaisRow().add(this.$getNCMRow()).add(this.$getEventoRow()).hide();

		switch (area) {
			case "im":
				$.merge(this.$getPaisRow(), this.$getNCMRow()).show();
				break;
			case "eventos":
				$.merge(this.$getPaisRow(), this.$getEventoRow()).show();
				break;
			case "secretaria":
				this.$getPaisRow().show();
				break;
			case "financeiro":
				this.$getEventoRow().show();
				break;
			default:
				return false;
		}
	}
}