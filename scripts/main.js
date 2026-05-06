document.documentElement.classList.add("js");

const showAllReveals = () => {
    document.querySelectorAll(".reveal").forEach((target) => {
        target.classList.add("is-visible");
    });
};

document.addEventListener("DOMContentLoaded", () => {
    try {
        const navbar = document.getElementById("navbar");
        const navToggle = document.getElementById("navToggle");
        const navLinks = document.getElementById("navLinks");
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const currentReadingRoot = document.getElementById("currentlyReadingBooks");
        const sevenStarRoot = document.getElementById("sevenStarBooks");
        const goodreadsMeta = document.getElementById("goodreadsMeta");

        const syncNavbar = () => {
            if (!navbar) {
                return;
            }

            if (window.scrollY > 12) {
                navbar.classList.add("scrolled");
            } else {
                navbar.classList.remove("scrolled");
            }
        };

        const setNavState = (isOpen) => {
            if (!navLinks || !navToggle) {
                return;
            }

            navLinks.classList.toggle("active", isOpen);
            navToggle.setAttribute("aria-expanded", String(isOpen));

            const spans = navToggle.querySelectorAll("span");
            if (spans.length === 3) {
                spans[0].style.transform = isOpen ? "translateY(6px) rotate(45deg)" : "none";
                spans[1].style.opacity = isOpen ? "0" : "1";
                spans[2].style.transform = isOpen ? "translateY(-6px) rotate(-45deg)" : "none";
            }
        };

        if (navToggle && navLinks) {
            if (!navToggle.getAttribute("aria-label")) {
                navToggle.setAttribute("aria-label", "Toggle navigation");
            }
            navToggle.setAttribute("aria-controls", "navLinks");
            navToggle.setAttribute("aria-expanded", "false");

            navToggle.addEventListener("click", () => {
                const isOpen = navLinks.classList.contains("active");
                setNavState(!isOpen);
            });

            navLinks.querySelectorAll("a").forEach((link) => {
                link.addEventListener("click", () => setNavState(false));
            });

            document.addEventListener("click", (event) => {
                if (!navLinks.classList.contains("active")) {
                    return;
                }

                if (navLinks.contains(event.target) || navToggle.contains(event.target)) {
                    return;
                }

                setNavState(false);
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    setNavState(false);
                }
            });
        }

        syncNavbar();
        window.addEventListener("scroll", syncNavbar, { passive: true });

        const formatDate = (value) => {
            if (!value) {
                return null;
            }

            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                return value;
            }

            return new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                year: "numeric"
            }).format(parsed);
        };

        const trimSummary = (value, maxLength = 170) => {
            if (!value) {
                return "";
            }

            const cleaned = value.replace(/\s+/g, " ").trim();
            if (cleaned.length <= maxLength) {
                return cleaned;
            }

            return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
        };

        const createBookCard = (book, accentLabel) => {
            const article = document.createElement("article");
            article.className = "book-card";

            if (book.cover) {
                const coverLink = document.createElement("a");
                coverLink.className = "book-cover";
                coverLink.href = book.url || book.reviewUrl || "https://www.goodreads.com/";
                coverLink.target = "_blank";
                coverLink.rel = "noreferrer";

                const image = document.createElement("img");
                image.src = book.cover;
                image.alt = `${book.title} cover`;
                image.loading = "lazy";

                coverLink.appendChild(image);
                article.appendChild(coverLink);
            }

            const copy = document.createElement("div");
            copy.className = "book-copy";

            const title = document.createElement("h3");
            title.className = "book-title";
            const titleLink = document.createElement("a");
            titleLink.href = book.url || book.reviewUrl || "https://www.goodreads.com/";
            titleLink.target = "_blank";
            titleLink.rel = "noreferrer";
            titleLink.textContent = book.title || "Untitled";
            title.appendChild(titleLink);
            copy.appendChild(title);

            const author = document.createElement("p");
            author.className = "book-author";
            author.textContent = book.author || "Unknown author";
            copy.appendChild(author);

            if (book.summary) {
                const summary = document.createElement("p");
                summary.className = "book-summary";
                summary.textContent = trimSummary(book.summary);
                copy.appendChild(summary);
            }

            const meta = document.createElement("div");
            meta.className = "book-meta";

            if (accentLabel) {
                const accent = document.createElement("span");
                accent.className = "book-chip book-chip-accent";
                accent.textContent = accentLabel;
                meta.appendChild(accent);
            }

            if (book.publishedYear) {
                const year = document.createElement("span");
                year.className = "book-chip";
                year.textContent = `Published ${book.publishedYear}`;
                meta.appendChild(year);
            }

            const addedDate = formatDate(book.dateAdded);
            if (addedDate) {
                const added = document.createElement("span");
                added.className = "book-chip";
                added.textContent = `Added ${addedDate}`;
                meta.appendChild(added);
            }

            if (book.shelves && book.shelves.length > 0) {
                const shelf = document.createElement("span");
                shelf.className = "book-chip";
                shelf.textContent = book.shelves.join(" / ");
                meta.appendChild(shelf);
            }

            if (meta.children.length > 0) {
                copy.appendChild(meta);
            }

            article.appendChild(copy);
            return article;
        };

        const renderEmptyState = (root, titleText, bodyText) => {
            if (!root) {
                return;
            }

            root.replaceChildren();
            const article = document.createElement("article");
            article.className = "book-card book-card-placeholder";

            const copy = document.createElement("div");
            copy.className = "book-copy";

            const title = document.createElement("h3");
            title.className = "book-title";
            title.textContent = titleText;

            const body = document.createElement("p");
            body.className = "book-author";
            body.textContent = bodyText;

            copy.append(title, body);
            article.appendChild(copy);
            root.appendChild(article);
        };

        const renderGoodreads = async () => {
            if (!currentReadingRoot && !sevenStarRoot) {
                return;
            }

            try {
                const response = await fetch("data/goodreads.json", { cache: "no-store" });
                if (!response.ok) {
                    throw new Error(`Goodreads snapshot fetch failed: ${response.status}`);
                }

                const payload = await response.json();
                const currentlyReading = Array.isArray(payload.currentlyReading) ? payload.currentlyReading : [];
                const featuredShelf = Array.isArray(payload.featuredShelf?.items) ? payload.featuredShelf.items : [];

                if (currentReadingRoot) {
                    currentReadingRoot.replaceChildren();
                    if (currentlyReading.length === 0) {
                        renderEmptyState(
                            currentReadingRoot,
                            "Nothing here right now",
                            "No active books are showing on the current reading shelf."
                        );
                    } else {
                        currentlyReading.slice(0, 3).forEach((book) => {
                            currentReadingRoot.appendChild(createBookCard(book, "Currently reading"));
                        });
                    }
                }

                if (sevenStarRoot) {
                    sevenStarRoot.replaceChildren();
                    if (featuredShelf.length === 0) {
                        renderEmptyState(
                            sevenStarRoot,
                            "No books here yet",
                            "The 7-star shelf is public, but there are no books showing in it right now."
                        );
                    } else {
                        featuredShelf.slice(0, 3).forEach((book) => {
                            sevenStarRoot.appendChild(createBookCard(book, "7-star pick"));
                        });
                    }
                }

                if (goodreadsMeta) {
                    const parts = ["From my public Goodreads shelves"];
                    const updatedAt = formatDate(payload.updatedAt);
                    if (updatedAt) {
                        parts.push(`updated ${updatedAt}`);
                    }
                    goodreadsMeta.textContent = parts.join(" • ");
                }
            } catch (error) {
                renderEmptyState(
                    currentReadingRoot,
                    "Reading list unavailable",
                    "The books are not loading at the moment, but the Goodreads profile link still works."
                );
                renderEmptyState(
                    sevenStarRoot,
                    "Favorites unavailable",
                    "The favorites shelf is not loading at the moment, but it should be back shortly."
                );

                if (goodreadsMeta) {
                    goodreadsMeta.textContent = "From my public Goodreads shelves.";
                }

                console.error(error);
            }
        };

        renderGoodreads();

        const revealTargets = document.querySelectorAll(".reveal");
        if (!prefersReducedMotion && revealTargets.length > 0 && "IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries, currentObserver) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        currentObserver.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                rootMargin: "0px 0px -8% 0px",
                threshold: 0.18
            });

            revealTargets.forEach((target) => observer.observe(target));
        } else {
            showAllReveals();
        }
    } catch (error) {
        showAllReveals();
        console.error(error);
    }
});
