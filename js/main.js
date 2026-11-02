// Элементы страницы. Некоторых из них может не быть на конкретной странице:
// модальное окно есть только на главной, а форма — на главной и на странице заявки.
const orderDialog = document.getElementById('order-dialog');
const closeDialogButton = document.getElementById('close-order-dialog');
const selectedProductInput = document.getElementById('selected-product');
const orderForm = document.getElementById('order-form');
const successMessage = document.getElementById('success-message');
const productSelect = document.getElementById('order-product');

// Получаем все кнопки заказа в карточках товаров.
const orderButtons = document.querySelectorAll('.product-card__button');

// Открываем модальное окно по кнопке «Заказать».
if (orderDialog) {
  orderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Записываем название товара в скрытое поле формы.
      selectedProductInput.value = button.dataset.product;

      orderDialog.showModal();
    });
  });
}

// Закрываем модальное окно по кнопке «Закрыть».
if (orderDialog && closeDialogButton) {
  closeDialogButton.addEventListener('click', () => {
    orderDialog.close();
  });
}

// На странице заявки подставляем товар из адресной строки: order.html?product=Товар 1
if (productSelect) {
  const productFromUrl = new URLSearchParams(window.location.search).get('product');

  if (productFromUrl) {
    productSelect.value = productFromUrl;
  }
}

// Обрабатываем отправку формы.
if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    // Отменяем стандартную отправку формы,
    // потому что backend пока не подключён.
    event.preventDefault();

    // Сбрасываем предыдущие признаки ошибок.
    const formElements = Array.from(orderForm.elements);

    formElements.forEach((element) => {
      if (element.willValidate) {
        element.removeAttribute('aria-invalid');
      }
    });

    // Проверяем встроенные HTML-ограничения формы.
    if (!orderForm.checkValidity()) {
      formElements.forEach((element) => {
        if (element.willValidate && !element.checkValidity()) {
          element.setAttribute('aria-invalid', 'true');
        }
      });

      // Показываем стандартные сообщения браузера.
      orderForm.reportValidity();
      return;
    }

    // Показываем сообщение об успешной отправке.
    successMessage.hidden = false;

    // Очищаем форму.
    orderForm.reset();

    // Закрываем модальное окно, если форма была в нём.
    if (orderDialog) {
      orderDialog.close();
    }
  });
}
