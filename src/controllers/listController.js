import { create } from "../helpers/io";
import eventEmitter from "../helpers/eventEmitter";

let classes;

// String holders
const Expand = "aria-expanded";
const Active = "aria-activedescendant";
const Selected = "aria-selected";

/**
 * List all matching results
 *
 * @param {Object} ctx - autoComplete.js configurations
 *
 * @returns {Component} - Results list component
 */
const renderList = (ctx) => {
  let { resultsList, list, resultItem, dataFeedback } = ctx;
  const { query, matches, results } = dataFeedback;

  // Reset cursor
  ctx.cursor = -1;

  // Clear list
  list.innerHTML = "";

  if (matches.length || resultsList.noResults) {
    const fragment = document.createDocumentFragment();

    // Generate results elements
    results.forEach((result, index) => {
      // Create new list item
      const element = create(resultItem.tag, {
        id: `${resultItem.id}_${index}`,
        role: "option",
        innerHTML: result.match,
        inside: fragment,
        ...(resultItem.class && { class: resultItem.class }),
      });

      // If custom content is active pass params
      if (resultItem.element) resultItem.element(element, result);
    });

    // Add fragment of result items to DOM list
    list.append(fragment);

    // Run custom container function if active
    if (resultsList.element) resultsList.element(list, dataFeedback);

    openList(ctx);
  } else {
    // Check if there are NO results
    closeList(ctx);
  }
};

/**
 * Open closed list
 *
 * @param {Object} ctx - autoComplete.js configurations
 *
 * @returns {void}
 */

const openList = (ctx) => {
  if (!ctx.isOpened) {
    // Set expanded attribute on the wrapper to true
    ctx.wrapper.setAttribute(Expand, true);
    // Reset input active descendant attribute
    ctx.input.setAttribute(Active, "");
    // Remove hidden attribute from list
    ctx.list.removeAttribute("hidden");
    // Set list to opened
    ctx.isOpened = true;

    /**
     * @emit {open} event after results list is opened
     **/
    eventEmitter("open", ctx);
  }
};

/**
 * Close open list
 *
 * @param {Object} ctx - autoComplete.js configurations
 *
 * @returns {void}
 */
const closeList = (ctx) => {
  if (ctx.isOpened) {
    // Set expanded attribute on the wrapper to false
    ctx.wrapper.setAttribute(Expand, false);
    // Add input active descendant attribute
    ctx.input.setAttribute(Active, "");
    // Add hidden attribute from list
    ctx.list.setAttribute("hidden", "");
    // Set list to closed
    ctx.isOpened = false;

    /**
     * @emit {close} event after "resultsList" is closed
     **/
    eventEmitter("close", ctx);
  }
};

/**
 * Select result item by index
 *
 * @param {Number} index - of the selected result item
 * @param {Object} ctx - autoComplete.js configurations
 *
 * @returns {void}
 */
const goTo = (index, ctx) => {
  const results = ctx.list.getElementsByTagName(ctx.resultItem.tag);

  if (ctx.isOpened && results.length) {
    // Previous cursor state
    const state = ctx.cursor;

    // Reset cursor to first item if exceeding end of list
    if (index >= results.length) index = 0;
    // Move cursor to the last item if exceeding beginning of list
    if (index < 0) index = results.length - 1;

    // Current cursor position
    ctx.cursor = index;

    if (state > -1) {
      // Remove "aria-selected" attribute from the item
      results[state].removeAttribute(Selected);
      // Remove "selected" class from the item
      if (classes) results[state].classList.remove(...classes);
    }

    // Set "aria-selected" value to true
    results[index].setAttribute(Selected, true);
    // Add "selected" class to the selected item
    if (classes) results[index].classList.add(...classes);

    // Set "aria-activedescendant" value to the selected item
    ctx.input.setAttribute(Active, results[ctx.cursor].id);
    ctx.dataFeedback.cursor = ctx.cursor;

    // Scroll to selection
    results[index].scrollIntoView({ behavior: ctx.resultsList.scroll || "smooth", block: "center" });

    /**
     * @emit {navigate} event on results list navigation
     **/
    eventEmitter("navigate", ctx);
  }
};

/**
 * Select next result item
 *
 * @param {Object} ctx - autoComplete.js configurations
 *
 * @returns {void}
 */
const next = function (ctx) {
  const index = ctx.cursor + 1;
  goTo(index, ctx);
};

/**
 * Select previous result item
 *
 * @param {Object} ctx - autoComplete.js configurations
 *
 * @returns {void}
 */
const previous = (ctx) => {
  const index = ctx.cursor - 1;
  goTo(index, ctx);
};

/**
 * Select result item with given index or current cursor
 *
 * @param {Object} ctx - autoComplete.js configurations
 * @param {Object} event - of selection
 * @param {Number} index - of the selected result item
 *
 * @returns {void}
 */
const select = (ctx, event, index) => {
  // Check if cursor within list range
  index = index || ctx.cursor;

  // Prevent empty selection
  if (index < 0) return;

  // Prepare onSelection data feedback object
  ctx.dataFeedback.event = event;
  ctx.dataFeedback.selection = {
    index,
    ...ctx.dataFeedback.results[index],
  };

  /**
   * @emit {selection} event on result item selection
   **/
  eventEmitter("selection", ctx);

  closeList(ctx);
};

/**
 * Click selection handler
 *
 * @param {Object} event - "Click" event object
 * @param {Object} ctx - autoComplete.js configurations
 *
 */
const click = (event, ctx) => {
  const resultItemElement = ctx.resultItem.tag.toUpperCase();
  const items = Array.from(ctx.list.children);
  const item = event.target.closest(resultItemElement);

  if (item && item.nodeName === resultItemElement) {
    event.preventDefault();
    const index = items.indexOf(item) - 1;

    select(ctx, event, index);
  }
};

/**
 * List navigation handler
 *
 * @param {Object} event - "keydown" press event Object
 * @param {Object} ctx - autoComplete.js configurations
 *
 */
const navigate = function (event, ctx) {
  const key = event.keyCode;
  const selected = ctx.resultItem.selected;

  if (selected) classes = selected.split(" ");

  // Check pressed key
  switch (key) {
    // Down/Up arrow
    case 40:
    case 38:
      event.preventDefault();

      // Move cursor based on pressed key
      key === 40 ? next(ctx) : previous(ctx);

      break;
    // Enter
    case 13:
      event.preventDefault();
      // If cursor moved
      if (ctx.cursor >= 0) {
        select(ctx, event);
      }

      break;
    // Tab
    case 9:
      if (ctx.resultsList.tabSelect && ctx.cursor >= 0) {
        event.preventDefault();

        select(ctx, event);
      } else {
        closeList(ctx);
      }
      break;
    // Esc
    case 27:
      event.preventDefault();

      // Clear "inputField" value
      ctx.input.value = "";

      closeList(ctx);
      break;
  }
};

export { renderList, openList, click, navigate, goTo, next, previous, select, closeList };
