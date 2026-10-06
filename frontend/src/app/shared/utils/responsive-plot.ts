import Plotly from 'plotly.js-dist-min';
import type { Config, Data, Layout, PlotlyHTMLElement } from 'plotly.js-dist-min';

type LayoutUpdate = Partial<Layout> & Record<string, unknown>;
type Presentation = (width: number, compact: boolean, availableWidth: number) => LayoutUpdate;

interface PlotObserver {
  observer?: ResizeObserver;
  frame?: number;
}

const observers = new WeakMap<HTMLElement, PlotObserver>();

/** Wrap plain text for Plotly without losing long variable names. */
export function wrapPlotText(text: string, characters: number): string {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > characters) {
      lines.push(line);
      line = '';
    }
    line = line ? `${line} ${word}` : word;
    while (line.length > characters) {
      lines.push(line.slice(0, characters));
      line = line.slice(characters);
    }
  }
  if (line) lines.push(line);
  return lines
    .map((value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'))
    .join('<br>');
}

/** Reserve space below the axes, including multiline variable names. */
export function plotLegendHeight(labels: string[], width: number, compact: boolean): number {
  let height = 0;
  let rowWidth = 0;
  let rowHeight = 0;
  for (const label of labels) {
    const lines = wrapPlotText(label, 24).split('<br>');
    const itemWidth = Math.max(...lines.map((line) => line.length)) * 7 + 60;
    const itemHeight = lines.length * 16 + 5;
    if (compact || (rowWidth > 0 && rowWidth + itemWidth > width)) {
      height += rowHeight;
      rowWidth = 0;
      rowHeight = 0;
    }
    rowWidth += itemWidth;
    rowHeight = Math.max(rowHeight, itemHeight);
  }
  return height + rowHeight;
}

export function purgeResponsivePlot(element: HTMLElement): void {
  const state = observers.get(element);
  state?.observer?.disconnect();
  if (state?.frame !== undefined) cancelAnimationFrame(state.frame);
  observers.delete(element);
  Plotly.purge(element);
  element.style.removeProperty('min-width');
  if (element.parentElement) delete element.parentElement.dataset['scrollable'];
}

/** Observe the scroll viewport, whose width is independent of the rendered SVG. */
export async function createResponsivePlot(
  element: HTMLElement,
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
  presentation: Presentation,
  minimumWidth = 0,
): Promise<PlotlyHTMLElement | null> {
  const viewport = element.parentElement;
  if (!viewport || !element.isConnected) return null;

  purgeResponsivePlot(element);
  element.style.minWidth = `${minimumWidth}px`;
  const state: PlotObserver = {};
  observers.set(element, state);
  const active = () => observers.get(element) === state && element.isConnected;
  const updates = (availableWidth: number): LayoutUpdate => {
    const width = Math.max(availableWidth, minimumWidth);
    viewport.dataset['scrollable'] = String(width > availableWidth);
    return { ...presentation(width, availableWidth < 600, availableWidth), width, autosize: true };
  };

  try {
    const plot = await Plotly.newPlot(
      element,
      data,
      { ...layout, width: Math.max(viewport.clientWidth, minimumWidth, 10) },
      { ...config, responsive: false }, // The container observer owns resizing.
    );
    if (!active()) return null;

    let lastWidth = viewport.clientWidth;
    await Plotly.relayout(plot, updates(lastWidth));
    if (!active()) return null;

    let resizing = false;
    const scheduleResize = () => {
      if (!active() || resizing || state.frame !== undefined) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = undefined;
        const width = viewport.clientWidth;
        if (!active() || width === 0 || width === lastWidth) return;
        lastWidth = width;
        resizing = true;
        void Plotly.relayout(plot, updates(width))
          .catch((error: unknown) => {
            if (active()) console.error('Failed to resize plot.', error);
          })
          .finally(() => {
            resizing = false;
            if (active() && viewport.clientWidth !== lastWidth) scheduleResize();
          });
      });
    };

    state.observer = new ResizeObserver(scheduleResize);
    state.observer.observe(viewport);
    return plot;
  } catch (error) {
    if (observers.get(element) === state) purgeResponsivePlot(element);
    throw error;
  }
}
