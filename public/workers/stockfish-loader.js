/* global Stockfish */

const STOCKFISH_BASE_PATH = '/workers/stockfish/';

let enginePromise = null;

function postEngineLine(line) {
  self.postMessage(String(line));
}

function postEngineError(error) {
  self.postMessage(`error engine unavailable: ${error instanceof Error ? error.message : String(error)}`);
}

function getEngine() {
  if (!enginePromise) {
    try {
      self.importScripts(`${STOCKFISH_BASE_PATH}stockfish.js`);

      enginePromise = Promise.resolve(
        Stockfish({
          locateFile(path) {
            return `${STOCKFISH_BASE_PATH}${path}`;
          },
        }),
      ).then(
        (engine) => {
          engine.addMessageListener(postEngineLine);

          return engine;
        },
        (error) => {
          postEngineError(error);
          throw error;
        },
      );
    } catch (error) {
      postEngineError(error);
      enginePromise = Promise.reject(error);
    }
  }

  return enginePromise;
}

function sendCommand(command) {
  getEngine()
    .then((engine) => {
      try {
        engine.postMessage(command);
      } catch (error) {
        postEngineError(error);
      }
    })
    .catch(() => undefined);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  const command = typeof data === 'string' ? data : data?.command;

  if (typeof command !== 'string' || command.length === 0) {
    return;
  }

  sendCommand(command);
});
