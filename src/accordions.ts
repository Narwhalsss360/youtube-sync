import { asType, wellDefined } from "./types";

enum AccordionKind {
  container = "container",
  header = "header",
  content = "content",
};

const ACCORDION_KIND_ATTRIBUTE_NAME: string = "accordion-kind";
const ACCORDION_GROUP_ATTRIBUTE_NAME: string = "accordion-group";
const ACCORDION_EXPANDED_ATTRIBUTE_NAME: string = "accordion-expanded";

export function findParent(elementNode: Node, predicate: (element: HTMLElement) => boolean): HTMLElement | null {
  const parent = elementNode.parentNode;
  if (parent?.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  const parentNode = parent as HTMLElement;

  if (predicate(parentNode)) {
    return parentNode;
  }

  return findParent(parentNode, predicate);
}

export function isAccordionContainer(element: any | undefined | null): element is HTMLDivElement {
  return element instanceof HTMLDivElement && element.getAttribute(ACCORDION_KIND_ATTRIBUTE_NAME) === AccordionKind.container;
}

export function requireContainerKind(container: HTMLDivElement): HTMLDivElement {
  if (container.getAttribute(ACCORDION_KIND_ATTRIBUTE_NAME) !== AccordionKind.container) {
    throw new Error(`Element (id="${container.id}") is not an accordion container`);
  }
  return container;
}

export function accordionsInGroup(group: string): Array<HTMLDivElement> {
  return Array.from(document.querySelectorAll(`div[accordion-kind="container"][accordion-group="${group}"]`));
}

export function otherAccordionsInGroup(container: HTMLDivElement): Array<HTMLDivElement> {
  requireContainerKind(container);
  const group = container.getAttribute(ACCORDION_GROUP_ATTRIBUTE_NAME);

  if (group) {
    return accordionsInGroup(group).filter(other => other.id !== container.id);
  }
  return [];
}

export function accordionHeaderAndContent(container: HTMLDivElement): [HTMLDivElement , HTMLDivElement | null] {
  return [
    wellDefined(
    asType<HTMLDivElement>(
        (element: Element) => element instanceof HTMLDivElement,
        container.querySelector(`div[${ACCORDION_KIND_ATTRIBUTE_NAME}="${AccordionKind.header}"]`)
      ),
      new Error("All accordion containers must have an accordion header")
    ),
    container.querySelector(`div[${ACCORDION_KIND_ATTRIBUTE_NAME}="${AccordionKind.content}"]`),
  ];
}

export function isExpanded(container: HTMLDivElement): boolean {
  requireContainerKind(container);
  return container.getAttribute(ACCORDION_EXPANDED_ATTRIBUTE_NAME) === "true";
}

function followAttributes(container: HTMLDivElement): void {
  function expand() {
    const content = accordionHeaderAndContent(container)[1];

    if (content !== null) {
      content.hidden = false;
      content.classList.remove("accordion-collapsed-content");
    }

    for (const otherContainer of otherAccordionsInGroup(container)) {
      if (isExpanded(container)) {
        otherContainer.setAttribute(ACCORDION_EXPANDED_ATTRIBUTE_NAME, "false");
      }
    }

    container.dispatchEvent(new Event("accordionexpand", {}));
  }

  function collapse(): void {
    const content = accordionHeaderAndContent(container)[1];

    if (content !== null) {
      content.hidden = true;
      content.classList.add("accordion-collapsed-content");
    }

    container.dispatchEvent(new Event("accordioncollapse", {}));
  }

  requireContainerKind(container);
  const expandedAttribute = container.getAttribute(ACCORDION_EXPANDED_ATTRIBUTE_NAME);
  if (expandedAttribute === "true") {
    expand();
  } else if (expandedAttribute === "false") {
    collapse();
  } else {
    container.setAttribute(ACCORDION_EXPANDED_ATTRIBUTE_NAME, "false");
    collapse();
  }
}

export function accordionCollapse(container: HTMLDivElement): void {
  requireContainerKind(container);
  container.setAttribute(ACCORDION_EXPANDED_ATTRIBUTE_NAME, "false");
}

export function accordionExpand(container: HTMLDivElement): void {
  requireContainerKind(container);
  container.setAttribute(ACCORDION_EXPANDED_ATTRIBUTE_NAME, "true");
}

export function accordionToggle(container: HTMLDivElement): void {
  requireContainerKind(container);
  if (isExpanded(container)) {
    accordionCollapse(container);
  } else {
    accordionExpand(container);
  }
}

export function accordionActivated(container: HTMLDivElement): void {
  requireContainerKind(container);
  accordionToggle(container);
}

function accordionHeaderPointerEvent(pointerEvent: PointerEvent): void {
  if (!(pointerEvent.target instanceof Node)) {
    throw new Error("Expected PointerEvent target to be a node");
  }

  const container: HTMLElement | null = findParent(pointerEvent.target, element => isAccordionContainer(element));
  if (!(container instanceof HTMLDivElement)) {
    throw new Error(`The function ${accordionHeaderAndContent.name} is to only be invoked from accordion header target trees with accordion container parent`);
  }

  accordionActivated(container);
}

const accordionContainerAttributeObserverConfig = { attributes: true };
const accordionContainerAttributeObserverCallback = (mutationList: Array<MutationRecord>, observer: MutationObserver) => {
  observer as unknown as void;

  for (const mutation of mutationList) {
    if (mutation.target instanceof HTMLDivElement && mutation.type === "attributes" && mutation.attributeName === "accordion-expanded") {
      requireContainerKind(mutation.target);
      followAttributes(mutation.target);
    }
  }
};

function ensureAccordionInitialized(container: HTMLDivElement): void {
  requireContainerKind(container);
  if (container.getAttribute("accordion-initialized") === "true") {
    return;
  }

  if (!document.contains(container)) {
    throw new Error(`Cannot initialize container (id="${container.id}"), not in document.`);
  }

  const header = accordionHeaderAndContent(container)[0];
  header.addEventListener("click", accordionHeaderPointerEvent);
  followAttributes(container);
  new MutationObserver(accordionContainerAttributeObserverCallback).observe(container, accordionContainerAttributeObserverConfig);
  container.setAttribute("accordion-initialized", "true");
}

const accordionsObserver = new MutationObserver((mutationsList, _) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      for (const added of mutation.addedNodes) {
        if (isAccordionContainer(added)) {
          ensureAccordionInitialized(added);
        }
      }
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  for (const container of document.querySelectorAll(`div[${ACCORDION_KIND_ATTRIBUTE_NAME}="${AccordionKind.container}"]`)) {
    if (isAccordionContainer(container)) {
      ensureAccordionInitialized(container);
    }
  }
  accordionsObserver.observe(document, { childList: true, subtree: true });
});
