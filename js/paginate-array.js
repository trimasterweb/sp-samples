function paginateArray (array, itemsPerPage){
  return array.reduce(function(pairs, item, index){
      var multiplo = index + 1;
      multiplo = multiplo + (multiplo%itemsPerPage)
      currentPair = (pairs[multiplo] || []).concat(item)
      pairs[multiplo] = currentPair
      return pairs
  },{})
}
 
