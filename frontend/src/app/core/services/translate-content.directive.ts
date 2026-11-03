import { AfterViewInit, DestroyRef, Directive, ElementRef, effect, inject } from '@angular/core';
import { LanguageService } from './language.service';

/** Translates the public site's existing CMS copy and template text in place. */
@Directive({ selector: '[yinTranslateContent]', standalone: true })
export class TranslateContentDirective implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly originals = new WeakMap<Text, { original: string; rendered: string }>();
  private readonly attributeOriginals = new WeakMap<Element, Map<string, { original: string; rendered: string }>>();
  private observer?: MutationObserver;

  constructor() {
    effect(() => {
      this.language.language();
      this.translateTree();
    });
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  ngAfterViewInit(): void {
    this.translateTree();
    if (typeof MutationObserver === 'undefined') return;
    this.observer = new MutationObserver(() => this.translateTree());
    this.observer.observe(this.host, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['title', 'placeholder', 'aria-label']
    });
  }

  private translateTree(): void {
    if (!this.host || this.host.classList.contains('admin-route-active')) return;
    const walker = document.createTreeWalker(this.host, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      if (!parent || parent.closest('script, style, textarea, [contenteditable="true"]')) continue;
      const current = textNode.nodeValue ?? '';
      const saved = this.originals.get(textNode);
      const original = saved && current === saved.rendered ? saved.original : current;
      const trimmed = original.trim();
      const translated = trimmed ? this.language.text(trimmed) : trimmed;
      const rendered = trimmed ? original.replace(trimmed, translated) : original;
      this.originals.set(textNode, { original, rendered });
      if (current !== rendered) textNode.nodeValue = rendered;
    }

    for (const element of this.host.querySelectorAll('[title], [placeholder], [aria-label]')) {
      let saved = this.attributeOriginals.get(element);
      if (!saved) { saved = new Map(); this.attributeOriginals.set(element, saved); }
      for (const name of ['title', 'placeholder', 'aria-label']) {
        const current = element.getAttribute(name);
        if (current === null) continue;
        const previous = saved.get(name);
        const original = previous && current === previous.rendered ? previous.original : current;
        const rendered = this.language.text(original);
        saved.set(name, { original, rendered });
        if (current !== rendered) element.setAttribute(name, rendered);
      }
    }
  }
}
