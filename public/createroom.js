$(document).ready(function () {
    $('#create-room').click(function () {
      validate()
    });
  }); 
  
  function validate() {
    showLoading()
    if ($("#orderShopUrl").val().length === 0) {
      hideLoading()
    }
  }
  
  function showLoading() {
    $("#spinner").attr("hidden", false);
    $("#orderShopName").attr("hidden", true);
    $("#orderShopUrl").attr("hidden", true);
    $("#create-room").attr("hidden", true);
  }
  
  function hideLoading() {
    $("#spinner").attr("hidden", true);
    $("#orderShopName").attr("hidden", false);
    $("#orderShopUrl").attr("hidden", false);
    $("#create-room").attr("hidden", false);
  }