/* global Stockfish */

const STOCKFISH_BASE_PATH = '/workers/stockfish/';

let enginePromise = null;

function postEngineLine(line) {
  self.postMessage(String(line));
}

function getEngine() {
  if (!enginePromise) {
    self.importScripts(`${STOCKFISH_BASE_PATH}stockfish.js`);

    enginePromise = Stockfish({
      locateFile(path) {
        return `${STOCKFISH_BASE_PATH}${path}`;
      },
    });

    enginePromise.then((engine) => {
      engine.addMessageListener(postEngineLine);

      return engine;
    });
  }

  return enginePromise;
}

function sendCommand(command) {
  getEngine()
    .then((engine) => {
      engine.postMessage(command);
    })
    .catch((error) => {
      self.postMessage(`error ${error instanceof Error ? error.message : String(error)}`);
    });
}

self.addEventListener('message', (event) => {
  const data = event.data;
  const command = typeof data === 'string' ? data : data?.command;

  if (typeof command !== 'string' || command.length === 0) {
    return;
  }

  sendCommand(command);
});
