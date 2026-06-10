"use strict";

const ul = document.querySelector('.content-footer ul');

if (ul) {
    const items = [...ul.children];
    const mark = () => {
        let top;
        for (const li of items) {
            li.classList.toggle('row-start', li.offsetTop !== top);
            top = li.offsetTop;
        }
    };
    new ResizeObserver(mark).observe(ul);
    mark();
}
