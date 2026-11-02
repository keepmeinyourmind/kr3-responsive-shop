// Без JavaScript меню и фильтры остаются открытыми и доступными.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.getElementById('site-navigation');
const desktop = window.matchMedia('(min-width: 1024px)');

if (menuButton && navigation) {
  function setMenu(open) {
    const expanded = desktop.matches || open;
    navigation.hidden = !expanded;
    menuButton.setAttribute('aria-expanded', String(expanded));
    menuButton.textContent = open ? 'Закрыть меню' : 'Открыть меню';
  }
  function updateMenu() {
    const focusedInside = navigation.contains(document.activeElement);
    const focusedToggle = document.activeElement === menuButton;
    menuButton.hidden = desktop.matches;
    setMenu(focusedInside);
    if (desktop.matches && focusedToggle) {
      navigation.querySelector('a').focus();
    }
  }
  updateMenu();
  desktop.addEventListener('change', updateMenu);
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a') && !desktop.matches) {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]') && !desktop.matches && !navigation.hidden) {
      setMenu(false);
      menuButton.focus();
    }
  });
}

const orderDialog = document.getElementById('order-dialog');
let dialogOpener;
if (orderDialog) {
  document.querySelectorAll('.product-card__button').forEach(button => {
    button.addEventListener('click', () => {
      dialogOpener = button;
      document.getElementById('selected-product').value = button.dataset.product;
      document.getElementById('order-dialog-title').textContent = `Заявка: ${button.dataset.product}`;
      orderDialog.showModal();
    });
  });
  document.getElementById('close-order-dialog').addEventListener('click', () => orderDialog.close());
  // Escape обрабатывается нативно, Tab циклически обходит поля и кнопки окна.
  orderDialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...orderDialog.querySelectorAll('input:not([type="hidden"]), select, textarea, button, a[href], [tabindex="0"]')]
      .filter(control => !control.disabled && control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  orderDialog.addEventListener('close', () => dialogOpener?.focus());
}

const productSelect = document.getElementById('order-product');
if (productSelect) {
  const product = new URLSearchParams(window.location.search).get('product');
  if ([...productSelect.options].some(option => option.value === product)) productSelect.value = product;
}

// Ошибка связана с полем через aria-describedby и объясняется текстом.
document.querySelectorAll('.order-form').forEach(form => {
  form.noValidate = true;
  const fields = [...form.querySelectorAll('input, select, textarea')].filter(field => field.willValidate);
  const status = document.getElementById('success-message');
  fields.forEach(field => {
    const error = document.createElement('p');
    error.id = `${field.id}-error`;
    error.className = 'form-error';
    error.hidden = true;
    field.closest('.order-form__field').append(error);
    const descriptions = [field.getAttribute('aria-describedby'), error.id].filter(Boolean);
    field.setAttribute('aria-describedby', descriptions.join(' '));
    if (field.required && field.type !== 'checkbox') {
      const label = form.querySelector(`label[for="${field.id}"]`);
      label.append(' (обязательно)');
    }
    field.addEventListener('input', () => {
      if (field.hasAttribute('aria-invalid')) validateField(field);
      status.textContent = '';
    });
  });
  function validateField(field) {
    const error = document.getElementById(`${field.id}-error`);
    const valid = field.checkValidity();
    error.hidden = valid;
    if (valid) {
      field.removeAttribute('aria-invalid');
      error.textContent = '';
    } else {
      field.setAttribute('aria-invalid', 'true');
      let message = 'Проверьте значение поля.';
      if (field.validity.valueMissing) message = field.type === 'checkbox' ? 'Подтвердите согласие на обработку данных.' : 'Заполните обязательное поле.';
      else if (field.validity.typeMismatch) message = 'Введите e-mail в формате name@example.com.';
      else if (field.validity.tooShort) message = `Введите не менее ${field.minLength} символов.`;
      else if (field.validity.patternMismatch) message = 'Введите телефон в формате +7 (900) 000-00-00.';
      error.textContent = message;
    }
    return valid;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = '';
    const invalid = fields.filter(field => !validateField(field));
    if (invalid.length) { invalid[0].focus(); return; }
    form.reset();
    if (orderDialog?.open) orderDialog.close();
    status.textContent = 'Форма проверена успешно. Это учебный проект: данные не отправляются на сервер.';
    // После закрытия диалога фокус возвращается на кнопку товара.
    if (!orderDialog) status.focus();
  });
});

const filterDetails = document.querySelector('.catalog-filters__details');
if (filterDetails) {
  function updateFilters() {
    filterDetails.open = desktop.matches || filterDetails.contains(document.activeElement);
  }
  updateFilters();
  desktop.addEventListener('change', updateFilters);
  filterDetails.addEventListener('toggle', () => {
    if (desktop.matches && !filterDetails.open) filterDetails.open = true;
  });
  const form = filterDetails.querySelector('form');
  const cards = [...document.querySelectorAll('.catalog-products .product-card')];
  const status = document.querySelector('.catalog-status');
  const from = document.getElementById('price-from');
  const to = document.getElementById('price-to');
  to.placeholder = '190000';
  form.querySelectorAll('[name="category"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.value === 'all' && checkbox.checked) {
        form.querySelectorAll('[name="category"]:not([value="all"])').forEach(item => { item.checked = false; });
      } else if (checkbox.checked) document.getElementById('filter-all').checked = false;
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    to.setCustomValidity('');
    if (from.value && to.value && Number(from.value) > Number(to.value)) {
      to.setCustomValidity('Цена «До» должна быть не меньше цены «От».');
      to.reportValidity(); return;
    }
    const selected = new FormData(form).getAll('category').filter(value => value !== 'all');
    const min = from.value === '' ? 0 : Number(from.value);
    const max = to.value === '' ? Infinity : Number(to.value);
    cards.forEach(card => {
      const price = Number(card.querySelector('.product-card__price').firstChild.textContent.replace(/\D/g, ''));
      card.hidden = (selected.length > 0 && !selected.includes(card.dataset.category)) || price < min || price > max;
    });
    const count = cards.filter(card => !card.hidden).length;
    status.textContent = count ? `Найдено товаров: ${count}` : 'Ничего не найдено. Измените фильтры или сбросьте их.';
  });
  [from, to].forEach(field => field.addEventListener('input', () => to.setCustomValidity('')));
  form.addEventListener('reset', () => {
    to.setCustomValidity('');
    cards.forEach(card => { card.hidden = false; });
    status.textContent = `Найдено товаров: ${cards.length}`;
  });
}
