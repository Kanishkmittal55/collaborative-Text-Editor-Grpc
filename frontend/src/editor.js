import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/3024-day.css';
import 'codemirror/mode/markdown/markdown.js';
import {CHANGE_OBJECT_TYPE, ChangeObject} from './model/changeObject';
import {Position} from './model/position';

const NIGHT_THEME = '3024-day';
const MARKDOWN_MODE = 'markdown';
const LOG_OBJECT = '[editor] ';
const LINE_SEPARATOR = '\n';
const ORIGIN_REMOTE_DELETE = 'remoteDelete';
const ORIGIN_REMOTE_INSERT = 'remoteInsert';

/**
 * Class for accessing CodeMirror Editor
 */
class Editor {
  constructor(textAreaObj) {
    const _editor = CodeMirror.fromTextArea(textAreaObj, {
      lineNumbers: true,
      theme: NIGHT_THEME,
      mode: MARKDOWN_MODE,
      value: textAreaObj.value,
    });

    const _bookmarkMap = new Map();
    let _selectionPopup = null;

    /**
     * Subscribe for updates. Callback will be executed if
     * user inputs or deletes text.
     *
     * @param {function({ChangeObject})} callback
     */
    this.subscribeForUpdates = function(callback) {
      _editor.on('change', (_, obj) => {
        console.log(LOG_OBJECT + '"change" event fired: ', obj);

        if (obj.origin !== ORIGIN_REMOTE_DELETE && obj.origin !== ORIGIN_REMOTE_INSERT) {
          callCallbackForEachChar(callback, obj.removed, obj.from.line, obj.from.ch,
              CHANGE_OBJECT_TYPE.DELETION);
          callCallbackForEachChar(callback, obj.text, obj.from.line, obj.from.ch,
              CHANGE_OBJECT_TYPE.INSERTION);
        }
      });
    };

    /**
     * @param {ChangeObject} changeObject
     */
    this.insert = function(changeObject) {
      const from = {
        line: changeObject.getRow(),
        ch: changeObject.getColumn(),
      };
      _editor.doc.replaceRange(changeObject.getValue(), from, null, ORIGIN_REMOTE_INSERT);
    };

    /**
     * @param {ChangeObject} changeObject
     */
    this.delete = function(changeObject) {
      if (isNewLineSignBetweenTwoLines(_editor, changeObject)) {
        mergeTwoLines(_editor, changeObject.getRow(), changeObject.getRow() + 1);
      } else {
        const from = {
          line: changeObject.getRow(),
          ch: changeObject.getColumn(),
        };
        const to = {
          line: changeObject.getRow(),
          ch: changeObject.getColumn() + 1,
        };
        _editor.doc.replaceRange('', from, to, ORIGIN_REMOTE_DELETE);
      }
    };

    this.getValue = function() {
      return _editor.getValue(LINE_SEPARATOR);
    };

    /**
     * @param {ChangeObject} changeObject
     * @param {number} senderReplicaId
     * @param {string} nickName
     */
    this.displayRemoteCursor = function(changeObject, senderReplicaId, nickName) {
      const position = changeObject.getPosition();
      const previousMarkerObj = _bookmarkMap.get(senderReplicaId);
      let replicaColor;

      if (previousMarkerObj !== undefined) {
        replicaColor = previousMarkerObj.color;
        this.removeRemoteCursor(senderReplicaId);
      } else {
        replicaColor = selectHexColor(senderReplicaId);
      }

      let row = position.getRow();
      let column = position.getColumn();
      if (changeObject.getType() === CHANGE_OBJECT_TYPE.INSERTION) {
        column += 1;
        if (changeObject.getValue() === LINE_SEPARATOR) {
          row += 1;
        }
      }

      const cursorPos = {line: row, ch: column};
      const cursorElement = document.createElement('span');
      cursorElement.style.borderLeftColor = replicaColor;
      cursorElement.classList.add('cursorElement');

      const cursorName = document.createTextNode(nickName);
      const cursorFlag = document.createElement('span');
      cursorFlag.classList.add('cursorFlag');
      cursorFlag.style.backgroundColor = replicaColor;
      cursorFlag.appendChild(cursorName);
      cursorElement.appendChild(cursorFlag);

      console.debug(LOG_OBJECT + 'displayRemoteCursor(): ' + senderReplicaId + ' at [row=' + row + ',ch=' + column + ']');

      const marker = _editor.setBookmark(cursorPos, {widget: cursorElement});
      _bookmarkMap.set(senderReplicaId, {marker: marker, color: replicaColor});
    };

    this.removeRemoteCursor = function(senderReplicaId) {
      const cursor = _bookmarkMap.get(senderReplicaId);
      if (cursor !== undefined) {
        cursor.marker.clear();
        _bookmarkMap.delete(senderReplicaId);
        return true;
      }
      return false;
    };

    // ---------- ADDED MORE DEBUG STATEMENTS HERE ----------
    /* ----------------------------------------------------------------
     *  NEW CODE: Use CodeMirror’s selection interface to detect a user
     *            making (or clearing) a text selection.
     * ---------------------------------------------------------------- */
    _editor.on('beforeSelectionChange', (cmInstance, selectionObj) => {
      // Debug info about the selection
      console.debug(
          LOG_OBJECT + 'beforeSelectionChange event fired:',
          selectionObj,
      );

      // We can look at selectionObj.ranges[] to see the new selection(s).
      // For simplicity, we’ll just check if there is a non-empty selection
      // in the primary range. If so, show the popup; if not, hide it.

      // The new set of ranges:
      const newRanges = selectionObj.ranges;
      if (!newRanges || newRanges.length === 0) {
        hideSelectionPopup();
        return;
      }

      const firstRange = newRanges[0];
      // A range has .anchor and .head. If they're equal, there's no selection.
      const isEmpty = (
        firstRange.anchor.line === firstRange.head.line &&
        firstRange.anchor.ch === firstRange.head.ch
      );

      if (isEmpty) {
        // No actual text selected
        hideSelectionPopup();
      } else {
        // There is a selection. Let's figure out the 'from' coordinate
        // so we can place our pop-up near the start of that selection.
        const fromPos = comparePositions(firstRange.anchor, firstRange.head) <= 0 ?
          firstRange.anchor :
          firstRange.head;

        // Convert that 'fromPos' to page coords
        const coords = cmInstance.charCoords(fromPos, 'page');
        console.debug(
            LOG_OBJECT + `Selection fromPos= line:${fromPos.line}, ch:${fromPos.ch}, coords=`,
            coords,
        );

        showSelectionPopup(coords.left, coords.top);
      }
    });

    /* ----------------------------------------------------------------
     *  Helper function to compare line/ch positions
     * ---------------------------------------------------------------- */
    const comparePositions = (posA, posB) => {
      // If posA < posB => negative; if posA === posB => 0; else positive
      return CodeMirror.cmpPos(posA, posB);
    };

    /**
     * Creates a small pop-up and positions it
     * @param {number} x The x-position (in px) for the pop-up
     * @param {number} y The y-position (in px) for the pop-up
     */
    const showSelectionPopup = (x, y) => {
      console.debug(LOG_OBJECT + 'showSelectionPopup() at x=' + x + ', y=' + y);

      // Remove existing popup if any
      hideSelectionPopup();

      _selectionPopup = document.createElement('div');
      _selectionPopup.id = 'selectionPopup';
      _selectionPopup.textContent = 'Click me!';
      _selectionPopup.style.position = 'absolute';
      _selectionPopup.style.top = y + 'px';
      _selectionPopup.style.left = x + 'px';
      _selectionPopup.style.background = '#f0f0f0';
      _selectionPopup.style.border = '1px solid #333';
      _selectionPopup.style.padding = '5px';
      _selectionPopup.style.cursor = 'pointer';
      _selectionPopup.style.zIndex = 9999;

      // On click, log to the console
      _selectionPopup.addEventListener('click', () => {
        console.log('I am clicked');
      });

      document.body.appendChild(_selectionPopup);
    };

    /**
     * Removes the pop-up if it exists
     */
    const hideSelectionPopup = () => {
      console.debug(LOG_OBJECT + 'hideSelectionPopup() called');
      if (_selectionPopup) {
        document.body.removeChild(_selectionPopup);
        _selectionPopup = null;
        console.debug(LOG_OBJECT + 'Selection popup removed');
      }
    };

    /**
     * @param {_editor} editorObject
     * @param {ChangeObject} changeObject
     * @return {boolean}
     */
    const isNewLineSignBetweenTwoLines = function(editorObject, changeObject) {
      const lineContent = _editor.doc.getLine(changeObject.getRow());

      return changeObject.getColumn() === lineContent.length &&
        _editor.doc.lineCount() - 1 !== changeObject.getRow;
    };

    /**
     * @param {_editor} obj
     * @param {number} firstRowNumber
     * @param {number} secondRowNumber
     */
    const mergeTwoLines = function(obj, firstRowNumber, secondRowNumber) {
      const firstRow = _editor.doc.getLine(firstRowNumber);
      const secondRow = _editor.doc.getLine(secondRowNumber);

      const from = {line: firstRowNumber, ch: firstRow.length};
      const to = {line: secondRowNumber, ch: secondRow.length};

      _editor.doc.replaceRange(secondRow, from, to, ORIGIN_REMOTE_DELETE);
    };

    /**
     * @param {number} line
     * @param {number} column
     * @param {string} text
     * @param {CHANGE_OBJECT_TYPE} type
     * @return {ChangeObject}
     */
    const createChangeObject = function(line, column, text, type) {
      return new ChangeObject(new Position(line, column), text, type);
    };

    /**
     * @param {function({ChangeObject})} callback callback action to be executed for each char
     * @param {[string]} array
     * @param {number} line
     * @param {number} column
     * @param {CHANGE_OBJECT_TYPE} type
     */
    const callCallbackForEachChar = function(callback, array, line, column, type) {
      const iterator = new Iterator(array);
      let result = iterator.next();
      let _line = line;
      let _column = column;

      const getNextColumn = () => {
        if (type === CHANGE_OBJECT_TYPE.DELETION) {
          return _column;
        } else {
          return _column++;
        }
      };

      const setVarsForNextIteration = () => {
        if (type !== CHANGE_OBJECT_TYPE.DELETION) {
          ++_line;
          _column = 0;
        }
      };

      while (!result.done) {
        const charArray = (result.value.toString()).split('');

        charArray.forEach(
            (char) => callback(createChangeObject(_line, getNextColumn(), char, type)),
        );

        if (iterator.hasNext()) {
          callback(createChangeObject(_line, getNextColumn(), '\n', type));
        }

        result = iterator.next();
        setVarsForNextIteration();
      }
    };
  }
}

function selectHexColor(replicaId) {
  const colors = ['#AA0000', '#00740F', '#170486',
    '#898900', '#85003D', '#04667A',
    '#170d3c', '#4e0000', '#ff0058',
    '#af4000', '#7f3685', '#004948'];
  return colors[replicaId % colors.length];
}

class Iterator {
  constructor(someArray) {
    let _nextIndex = 0;
    const _array = someArray;
    this.next = function() {
      if (_nextIndex < _array.length) {
        return {
          value: _array[_nextIndex++],
          done: false,
        };
      } else {
        return {
          done: true,
        };
      }
    };
    this.hasNext = function() {
      return _nextIndex < _array.length;
    };
  }
}

export {Editor};
