!function () {
  $('#s1a1').click(function() {
    $.get('/service1/action1', function(result) {
      output($('#s1a1').data(), result)
    });
  });

  $('#s1a2').click(function() {
    $.get('/service1/action2', function(result) {
      output($('#s1a2').data(), result)
    });
  });

  $('#s2a1').click(function() {
    $.get('/service2/action1', function(result) {
      output($('#s2a1').data(), result)
    });
  });

  $('#s2a2').click(function() {
    $.get('/service2/action2', function(result) {
      output($('#s2a2').data(), result)
    });
  });

  output.el = $('#output')
  function output(info, result) {
    var service = info.service;
    var action = info.action;
    var entry = 
      '<div class="list-group">' +
        '<a href="#" class="list-group-item">' +
          '<h4 class="list-group-item-heading">' +
            service + ' ' + action + ' Poked</h4>' +
          '<pre class="list-group-item-text">' +
            JSON.stringify(result, null, 2) +
          '</pre>' +
        '</a>' +
      '</div>';
    output.el.prepend(entry);
  }


}()