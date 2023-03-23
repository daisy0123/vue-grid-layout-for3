import type { App } from 'vue';
import { SFCWithInstall } from '../../typings/global';
import GridItemView from './index.vue';

const GridItem: SFCWithInstall<typeof GridItemView> =
  GridItemView as SFCWithInstall<typeof GridItemView>;

GridItem.install = (app: App): void => {
  app.component('GridItem', GridItem);
};

export { GridItem };
