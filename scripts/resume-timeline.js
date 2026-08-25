(() => {
    const timelines = document.querySelectorAll("[data-career-timeline]");

    timelines.forEach((timeline) => {
        const stops = Array.from(timeline.querySelectorAll("[data-career-stop]"));
        const panels = Array.from(timeline.querySelectorAll("[data-career-panel]"));

        if (stops.length === 0 || panels.length === 0) {
            return;
        }

        const activate = (key, moveFocus = false) => {
            const activeIndex = stops.findIndex((stop) => stop.dataset.careerStop === key);

            if (activeIndex < 0) {
                return;
            }

            stops.forEach((stop, index) => {
                const isActive = index === activeIndex;
                stop.classList.toggle("is-active", isActive);
                stop.setAttribute("aria-selected", String(isActive));
                stop.tabIndex = isActive ? 0 : -1;
            });

            panels.forEach((panel) => {
                const isActive = panel.dataset.careerPanel === key;
                panel.hidden = !isActive;
                panel.classList.toggle("is-active", isActive);
            });

            timeline.style.setProperty("--career-progress", String(activeIndex / Math.max(1, stops.length - 1)));

            if (moveFocus) {
                stops[activeIndex].focus();
            }
        };

        stops.forEach((stop, index) => {
            stop.addEventListener("click", () => activate(stop.dataset.careerStop));
            stop.addEventListener("keydown", (event) => {
                let nextIndex = index;

                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    nextIndex = (index + 1) % stops.length;
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    nextIndex = (index - 1 + stops.length) % stops.length;
                } else if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = stops.length - 1;
                } else {
                    return;
                }

                event.preventDefault();
                activate(stops[nextIndex].dataset.careerStop, true);
            });
        });

        const initial = stops.find((stop) => stop.getAttribute("aria-selected") === "true") || stops.at(-1);
        activate(initial.dataset.careerStop);
    });
})();
