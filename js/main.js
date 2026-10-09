document.addEventListener("DOMContentLoaded", function () {
    // Smooth scroll para links de navegação
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute("href"));
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    // Atualiza link ativo da navbar ao rolar
    var sections = document.querySelectorAll("section[id]");
    var navLinks = document.querySelectorAll(".navbar .nav-link");

    function updateNav() {
        var scrollY = window.pageYOffset;
        sections.forEach(function (current) {
            var sectionHeight = current.offsetHeight;
            var sectionTop = current.offsetTop - 100;
            var sectionId = current.getAttribute("id");

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(function (link) {
                    link.classList.remove("active");
                    link.parentElement.classList.remove("active");
                });
                var targetLink = document.querySelector('.navbar a[href="#' + sectionId + '"]');
                if (targetLink) {
                    targetLink.classList.add("active");
                }
            }
        });
    }

    window.addEventListener("scroll", updateNav);
});
