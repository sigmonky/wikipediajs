var WIKIPEDIA = function() {
  var my = {};

  // DBPedia SPARQL endpoint
  my.endpoint = 'http://dbpedia.org/sparql/';

  // ### getData
  //
  // Return structured information (via callback) on the provided Wikipedia URL by querying
  // the DBPedia SPARQL endpoint and then tidying the data up.
  //
  // Data is return in the form of the following hash:
  //
  //    {
  //      raw: the-raw-json-from-dbpedia,
  //      summary: a-cleaned-up-set-of-the-properties (see extractSummary),
  //      dbpediaUrl: dbpedia-resource-url e.g. http://dbpedia.org/resource/World_War_II
  //    }
  //
  // Function is asynchronous as we have to call out to DBPedia to get the
  // info.
  my.getData = function(wikipediaUrl, callback, error) {
    var url = my._getDbpediaUrl(wikipediaUrl);
    function onSuccess(data) {
      callback({
        raw: data,
        dbpediaUrl: url,
        summary: my.extractSummary(url, data)
      })
    }
    my.getRawJSON(url, onSuccess, error);
  }

  // ### _getDbpediaUrl
  //
  // Convert a Wikipedia url convert to DBPedia url
  my._getDbpediaUrl = function(url) {
    if (url.indexOf('wikipedia')) {
      var parts = url.split('/');
      var title = parts[parts.length-1];
      url = 'http://dbpedia.org/resource/' + title;
    }
    return url;
  };

  // ### getRawJSON
  //
  // get raw RDF JSON for DBPedia resource from DBPedia SPARQL endpoint
  my.getRawJSON = function(url, callback, error) {
    var sparqlQuery = 'DESCRIBE <{{url}}>'.replace('{{url}}', url);
    var jqxhr = $.ajax({
      url: my.endpoint,
      data: {
        query: sparqlQuery,
        // format: 'application/x-json+ld'
        format: 'application/rdf+json'
      },
      success: callback,
      error: error
    });
  };

  // Standard RDF namespace prefixes for use in lookupProperty function
  my.PREFIX = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    owl: "http://www.w3.org/2002/07/owl#",
    dc: "http://purl.org/dc/terms/",
    foaf: "http://xmlns.com/foaf/0.1/",
    vcard: "http://www.w3.org/2006/vcard/ns#",
    dbp: "http://dbpedia.org/property/",
    dbo: "http://dbpedia.org/ontology/",
    geo: "http://www.geonames.org/ontology#",
    wgs: "http://www.w3.org/2003/01/geo/wgs84_pos#"
  };

  // ### lookupProperty
  // 
  // lookup a property value given a standard RDF/JSON property dictionary
  // e.g. something like ...
  // 
  //       ...
  //       "http://dbpedia.org/property/regent": [
  //              {
  //                  "type": "uri",
  //                  "value": "http://dbpedia.org/resource/Richard_I_of_England"
  //              }
  //          ],
  //       ...
  my._lookupProperty = function(dict, property) {
    // first expand namespace 
    for(key in WIKIPEDIA.PREFIX) {
      if (property.indexOf(key + ':') == 0) {
        property = WIKIPEDIA.PREFIX[key] + property.slice(key.length + 1);
      }
    }
    var values = dict[property];
    for (idx in values) {
      // only take english values if lang is present
      if (!values[idx]['lang'] || values[idx].lang == 'en') {
        return values[idx].value;
      }
    }
  };

  // Extract a standard set of attributes (e.g. title, description, dates etc
  // etc) from rdfJson and the given subject uri (url) e.g.
  // 
  //      extractSummary('http://dbpedia.org/resource/Rufus_Pollock', rdfJson object from dbpedia)
  my.extractSummary = function(subjectUri, rdfJson) {
    var properties = rdfJson[subjectUri];
    function lkup(attribs) {
      if (attribs instanceof Array) {
        var out = [];
        for (idx in attribs) {
          var _tmp = my._lookupProperty(properties, attribs[idx]);
          if (_tmp) {
            out.push(_tmp);
          }
        }
        return out;
      } else {
        return my._lookupProperty(properties, attribs);
      }
    }

    var summaryInfo = {
      title: lkup('rdfs:label'),
      description: lkup('dbo:abstract'),
      summary: lkup('rdfs:comment'),
      birthDate: lkup('dbp:birthDate'),
      deathDate: lkup('dbp:deathDate'),
      // both dbp:date and dbo:date are usually present but dbp:date is
      // frequently "bad" (e.g. just a single integer rather than a date)
      // whereas ontology value is better
      date: lkup('dbo:date'),
      place: lkup('dbp:place'),
      birthPlace: lkup('dpb:birthPlace'),
      deathPlace: lkup('dpb:deathPlace'),
      source: lkup('foaf:page'),
      images: lkup(['dbo:thumbnail', 'foaf:depiction', 'foaf:img']),
      location: {
        lat: lkup('wgs:lat'),
        lon: lkup('wgs:lon')
      }
    };

    summaryInfo.start = summaryInfo.birthDate || summaryInfo.date;
    summaryInfo.end = summaryInfo.deathDate;
    summaryInfo.location.title = summaryInfo.place || summaryInfo.birthPlace ||
      summaryInfo.deathPlace;
    summaryInfo.image = summaryInfo.images ? summaryInfo.images[0] : null;

    return summaryInfo;
  };

  return my;
}();