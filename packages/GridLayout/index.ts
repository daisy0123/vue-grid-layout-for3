import type { App } from 'vue';
import { SFCWithInstall } from '../../typings/global';
import GridLayoutView from './index.vue';

const GridLayout: SFCWithInstall<typeof GridLayoutView> =
  GridLayoutView as SFCWithInstall<typeof GridLayoutView>;

GridLayout.install = (app: App): void => {
  app.component('GridLayout', GridLayout);
};

export { GridLayout };
