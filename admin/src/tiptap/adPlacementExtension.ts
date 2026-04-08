import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    adPlacement: {
      insertAdPlacement: (placementCode: string) => ReturnType;
    };
  }
}

export const AdPlacement = Node.create({
  name: 'adPlacement',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      placementCode: {
        default: 'article_inline_1',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-ad-placement') || 'article_inline_1',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-ad-placement]' }];
  },

  renderHTML({ node }) {
    const code = String(node.attrs.placementCode || 'article_inline_1');
    return ['div', { 'data-ad-placement': code, class: 'ad-embed-placeholder' }];
  },

  addCommands() {
    return {
      insertAdPlacement:
        (placementCode: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { placementCode },
          }),
    };
  },
});
