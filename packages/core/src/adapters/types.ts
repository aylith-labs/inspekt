export interface ComponentNode {
  name: string;
  filePath: string | null;
  line: number | null;
  column: number | null;
  domElement: HTMLElement | null;
  props: Record<string, unknown> | null;
  children: ComponentNode[];
  framework: 'react' | 'vue' | 'svelte' | 'solid' | 'unknown';
  depth: number;
}

export interface FrameworkAdapter {
  name: string;
  detect(): boolean;
  getComponentTree(root: HTMLElement): ComponentNode | null;
  getComponentAtElement(element: HTMLElement): ComponentNode | null;
  getAncestors(element: HTMLElement): ComponentNode[];
}
