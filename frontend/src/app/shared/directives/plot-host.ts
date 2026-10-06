import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { purgeResponsivePlot } from '@shared/utils/responsive-plot';

/** Release Plotly listeners and the resize observer when an @if block or route closes. */
@Directive({ selector: '[appPlotHost]' })
export class PlotHost {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    inject(DestroyRef).onDestroy(() => purgeResponsivePlot(element));
  }
}
