var SPUtils = {
  parseSearchResults: function(data){
    	var mapCells = function(item){
        item.Cells.results.reduce(function(retorno, current, index, array){
          retorno[index] = current.Key
          current.Value = current.Value  || ''
          current.Value = current.Value.replace('string;#', '');
          retorno[current.Key] = current.Value
          return retorno
        }, {})
      }
      return data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results.map(mapCells);      
    }
}
