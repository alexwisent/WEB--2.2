document.querySelector('.back-to-top').addEventListener('click', function(e) { // Находим элемент на странице с классом 'back-to-top' и добавляем ему обработчик события 'click'
	e.preventDefault(); // Отменяем стандартное поведение элемента
	window.scrollTo({top: 0, behavior: 'smooth'}); // Плавно прокручиваем страницу к верху (к координате top: 0)
});