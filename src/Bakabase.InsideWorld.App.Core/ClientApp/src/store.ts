// src/store.ts
import { createStore } from 'ice';
import clientApp from './models/clientApp';
import Optionses from './models/options';
import backgroundTasks from '@/models/backgroundTasks';
import iwFsEntryTasks from '@/models/iwFsEntryTasks';
import resourceTasks from '@/models/resourceTasks';
import icons from '@/models/icons';
import downloadTasks from '@/models/downloadTasks';
import iwFsEntryChangeEvents from '@/models/iwFsEntryChangeEvents';
import dependentComponentContexts from '@/models/dependentComponentContexts';
import fileMovingProgresses from '@/models/fileMovingProgresses';
import appUpdaterState from '@/models/appUpdaterState';
import reservedOptions from '@/models/reservedOptions';

const {
  appOptions,
  uiOptions,
  bilibiliOptions,
  exHentaiOptions,
  fileSystemOptions,
  javLibraryOptions,
  pixivOptions,
  resourceOptions,
  thirdPartyOptions,
  networkOptions,
} = Optionses;

export default createStore({
  backgroundTasks,
  iwFsEntryTasks,
  resourceTasks,
  icons,
  downloadTasks,
  clientApp,
  iwFsEntryChangeEvents,
  dependentComponentContexts,
  fileMovingProgresses,
  appUpdaterState,
  reservedOptions,

  appOptions,
  uiOptions,
  bilibiliOptions,
  exHentaiOptions,
  fileSystemOptions,
  javLibraryOptions,
  pixivOptions,
  resourceOptions,
  thirdPartyOptions,
  networkOptions,
});
