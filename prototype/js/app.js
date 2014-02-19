jQuery(function() {
  var q = "http://en.wikipedia.org/wiki/Jazz_Gillum";



    $('.loading').show();

    var display = function(info) {
      $('.loading').hide();
      $('.results').show();

      rawData = info.raw;
      var summaryInfo = info.summary;
      var properties = rawData[info.dbpediaUrl];
      for (key in summaryInfo) {
        console.log(".summary ." + key);
        console.log(summaryInfo[key]);
        $('.summary .' + key).text(summaryInfo[key]);
      }
      $('.summary .thumbnail').attr('src', summaryInfo.image);
      var dataAsJson = JSON.stringify(summaryInfo, null, '    ')
      $('.summary .raw').val(dataAsJson);
    };

    WIKIPEDIA.getData(q, display, function(error) {
        alert(error);
      }
    );


  $('.js-data-summary').click(function(e) {
    $('.data-summary').show();
  });
});

