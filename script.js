document.addEventListener('DOMContentLoaded', () => {
    initSwitch();
});

function initSwitch() {
    /** @var {HTMLInputELement} */
    const checkbox = document.querySelector("#switch");
    /** @var {HTMLBodyElement} */
    const body = document.querySelector("body");

    if (checkbox.checked) {
        body.classList.add("warm");
    }

    checkbox.addEventListener("change", (event) => {
        if (event.currentTarget.checked) {
            body.classList.add("warm");
        } else {
            body.classList.remove("warm");
        }
    });
}