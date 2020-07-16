function myFunction() {
  var value = document.getElementById('addToUser');
  var x = value.options[value.selectedIndex];
  var add = document.getElementById('add');
  if (x.text != 'Select') {
    add.setAttribute('value', x.text);
  } else {
    add.setAttribute('value', '');
  }
}
