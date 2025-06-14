function checkPasswordConfirm(formId) {
  let password = document.querySelector(`#${formId} [name=password]`);
  let confirmPassword = document.querySelector(`#${formId} [name=confirmPassword]`);

  if (password.value != confirmPassword.value) {
    confirmPassword.setCustomValidity("Password not match!");
    confirmPassword.reportValidity();
  } else {
    confirmPassword.setCustomValidity("");
  }
}

function togglePass(inputId) {
  const passwordInput = document.getElementById(inputId);
  if (passwordInput.type === "password") {
    passwordInput.type = "text"; // Show password
  } else {
    passwordInput.type = "password"; // Hide password
  }
}
