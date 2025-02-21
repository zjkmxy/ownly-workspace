import * as Y from 'yjs';

import { GlobalBus } from '@/services/event-bus';

/**
 * Deserialize a Yjs XML fragment from a string.
 * Make sure to run this in a transaction.
 * Only works in the browser not in Node.js.
 *
 * @param xmlString The XML string to deserialize.
 * @param frag The Yjs XML fragment to deserialize into.
 */
export function deserializeYxml(xmlString: string, frag: Y.XmlFragment): void {
  xmlString = `<document>${xmlString}</document>`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // walk the DOM and add elements to the Yjs fragment
  const walk = (node: Node, parent: Y.XmlElement | Y.XmlFragment) => {
    if (node instanceof Text && node.nodeValue !== null) {
      parent.push([new Y.XmlText(node.nodeValue)]);
      return;
    }

    if (node instanceof Element) {
      if (node.nodeName === 'parsererror') {
        throw new Error('Failed to parse XML document');
      }

      const el = new Y.XmlElement(node.nodeName);
      parent.push([el]);
      for (const attr of node.attributes) {
        el.setAttribute(attr.name, attr.value);
      }
      for (const child of node.childNodes) {
        walk(child, el);
      }
    }
  };

  // Exclude our root element. Do not throw since we are in a transaction.
  try {
    for (const child of doc.documentElement.childNodes) {
      walk(child, frag);
    }
  } catch (e) {
    GlobalBus.emit('wksp-error', new Error(`Failed to parse XML document: ${e}`));
  }
}
