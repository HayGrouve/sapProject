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

function myFunction1() {
  var value = document.getElementById('removeFromUser');
  var x = value.options[value.selectedIndex];
  var remove = document.getElementById('remove');
  if (x.text != 'Select') {
    remove.setAttribute('value', x.text);
  } else {
    remove.setAttribute('value', '');
  }
}
