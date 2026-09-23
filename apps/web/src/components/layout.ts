// One masonry definition for every card grid. Column *width* rather than a
// column count, so the number of columns follows the page width — the grid
// fills whatever horizontal space it is given instead of stopping at a
// breakpoint.
// Phones get two columns — the Pinterest / mobile-app grid — before the
// width-driven layout takes over.
export const MASONRY = "columns-2 gap-3 sm:columns-[18rem] sm:gap-5";

// The dock appears once the hero search has scrolled out of the way.
export const DOCK_AFTER_PX = 160;
