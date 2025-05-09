/**
 * The application's splash window is shown while connecting
 * to the database and checking for database updates.
 *
 * @module
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import Logo from '@liga/frontend/assets/icon.png';
import Background from '@liga/frontend/assets/splash.png';
import { Constants, Util } from '@liga/shared';
import '@liga/frontend/assets/styles.css';

/**
 * Database status messages.
 *
 * @enum
 */
enum DatabaseStatus {
  Connecting = 'Connecting to database...',
  Connected = 'Connected.',
}

/**
 * Updater status messages.
 *
 * @enum
 */
enum UpdaterStatus {
  Checking = 'Checking for updates...',
  Downloading = 'Downloading update...',
  Finished = 'Download finished.',
  NoUpdates = 'No updates available.',
}

/**
 * Plugin manager status messages.
 *
 * @enum
 */
enum PluginStatus {
  Checking = 'Checking for game plugins...',
  Downloading = 'Downloading game plugins...',
  Finished = 'Game plugins download finished.',
  Installing = 'Installing game plugins...',
  NoUpdates = 'No game plugin updates available.',
  Error = 'Error: Could not download game plugins.',
}

/** @constant */
const FAUX_TIMEOUT = 500;

/**
 * The index component
 *
 * @component
 */
function Index() {
  const [status, setStatus] = React.useState<DatabaseStatus | UpdaterStatus | PluginStatus>(
    UpdaterStatus.Checking,
  );
  const [progress, setProgress] = React.useState<number>();

  // the updater is heavily event-driven so wrap it in a promise
  // to hold the app here while it runs through its lifecycle
  React.useEffect(() => {
    Util.sleep(FAUX_TIMEOUT).then(
      () =>
        new Promise((resolve) => {
          api.updater.start();
          api.ipc.on(Constants.IPCRoute.UPDATER_NO_UPDATE, () =>
            resolve(setStatus(UpdaterStatus.NoUpdates)),
          );
          api.ipc.on(Constants.IPCRoute.UPDATER_DOWNLOADING, () =>
            setStatus(UpdaterStatus.Downloading),
          );
          api.ipc.on(Constants.IPCRoute.UPDATER_FINISHED, () =>
            resolve(setStatus(UpdaterStatus.Finished)),
          );
        }),
    );
  }, []);

  // if there was an update download then
  // trigger a restart of the application
  React.useEffect(() => {
    if (status !== UpdaterStatus.Finished) {
      return;
    }

    api.updater.install();
  }, [status]);

  // the plugin manager is also event-driven so wrap it in a promise
  // to hold the app here while it runs through its lifecycle
  React.useEffect(() => {
    if (status !== UpdaterStatus.NoUpdates) {
      return;
    }

    Util.sleep(FAUX_TIMEOUT).then(
      () =>
        new Promise((resolve) => {
          api.plugins.start();
          api.ipc.on(Constants.IPCRoute.PLUGINS_CHECKING, () => setStatus(PluginStatus.Checking));
          api.ipc.on(Constants.IPCRoute.PLUGINS_NO_UPDATE, () =>
            resolve(setStatus(PluginStatus.NoUpdates)),
          );
          api.ipc.on(Constants.IPCRoute.PLUGINS_DOWNLOADING, () =>
            setStatus(PluginStatus.Downloading),
          );
          api.ipc.on(Constants.IPCRoute.PLUGINS_DOWNLOAD_PROGRESS, setProgress);
          api.ipc.on(Constants.IPCRoute.PLUGINS_INSTALLING, () =>
            setStatus(PluginStatus.Installing),
          );
          api.ipc.on(Constants.IPCRoute.PLUGINS_FINISHED, () =>
            resolve(setStatus(PluginStatus.Finished)),
          );
          api.ipc.on(Constants.IPCRoute.PLUGINS_ERROR, () =>
            resolve(setStatus(PluginStatus.Error)),
          );
        }),
    );
  }, [status]);

  // if plugins were downloaded, we can
  // proceed connecting to the database
  React.useEffect(() => {
    if (
      status !== PluginStatus.Finished &&
      status !== PluginStatus.NoUpdates &&
      status !== PluginStatus.Error
    ) {
      return;
    }

    Util.sleep(FAUX_TIMEOUT)
      .then(() => {
        setStatus(DatabaseStatus.Connecting);
        return Util.sleep(FAUX_TIMEOUT);
      })
      .then(() => api.database.connect())
      .then(() => Util.sleep(FAUX_TIMEOUT))
      .then(() => {
        return Promise.resolve(setStatus(DatabaseStatus.Connected));
      })
      .then(() => Util.sleep(FAUX_TIMEOUT))
      .then(() => {
        api.window.open(Constants.WindowIdentifier.Landing);
        api.window.close(Constants.WindowIdentifier.Splash);
      });
  }, [status]);

  return (
    <React.StrictMode>
      <main
        className="center relative h-screen gap-5 bg-cover bg-center"
        style={{ backgroundImage: `url(${Background})` }}
      >
        <section className="center gap-5">
          <img src={Logo} className="size-32 object-cover" />
          <p>{status}</p>
        </section>

        <section className="relative w-2/3">
          {!!progress && <progress className="progress absolute" value={progress} max="100" />}
        </section>
      </main>
    </React.StrictMode>
  );
}

/**
 * React bootstrapping logic.
 *
 * @function
 * @name anonymous
 */
(() => {
  // grab the root container
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('Failed to find the root element.');
  }

  // set the theme
  container.dataset.theme = Constants.ThemeSetting.DARK;

  // render the react application
  ReactDOM.createRoot(container).render(<Index />);
})();
