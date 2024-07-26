/* eslint-disable no-prototype-builtins */
/* eslint-disable vars-on-top */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-var */
/* eslint-disable no-param-reassign */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */

window.OsmosContextsByToken =
  window.OsmosContextsByToken || window.FortyTwoLayersContextsByToken || {};

window.Osmos = (function () {
  // set the following to 'true' when working on the embedded uploader or embedded jobs table locally
  // local changes can be tested using the button-harness.html file
  // NOTE: Make sure to change it back to 'false' before committing changes
  const isLocalDevelopment = window.location.host === 'localhost:3000' ?? false;

  const URL_PREFIX = 'https://app.osmos.io';
  const API_PREFIX =  'https://api.osmos.io';
  const MAX_RECORDS = 100_000;

  // iframe should be 100% width and height, with an 18px margin on all sides
  const getIframeHeight = (currentInnerHeight) => currentInnerHeight - 18 * 2;
  const getIframeWidth = (currentInnerWidth) => currentInnerWidth - 18 * 2;

  const mkResizeHandler = (ctx) => (_evt) => {
    if (!ctx.iframeElement) {
      return;
    }

    ctx.iframeElement.height =
      ctx.iframeProps?.height ?? getIframeHeight(window.innerHeight);
    ctx.iframeElement.width =
      ctx.iframeProps?.width ?? getIframeHeight(window.innerWidth);
  };

  const style = document.createElement('style');
  style.innerHTML =
    '.ftl-button { height: 43px; width: 180px; background: #1888E2; border: 1px solid #1888E2; box-sizing: border-box; border-radius: 4px; color: white; font-size: 14px; font-weight: 500; line-height: 16px; letter-spacing: 1.25px; text-transform: uppercase; text-align: center; cursor: pointer; }';
  document.getElementsByTagName('head')[0].appendChild(style);

  const ctx = {
    version: 1,
    validators: [null],
    validOptionsGetters: [null],
    disableAdvancedMode: false,
    maxRecords: MAX_RECORDS,
    hideCSVPreviewPane: false,
    autoMapEnabled: true,
    autoRecallEnabled: true,
    storeTransformsForRecall: true,
  };

  function createBackdropElement() {
    const elem = document.createElement('div');
    elem.id = 'ftl-uploader-backdrop';
    elem.style =
      'position: fixed; top: 0; left: 0; height: 100vh; width: 100vw; background-color: rgba(135, 135, 135, 0.6); z-index: 2147483644;';
    return elem;
  }

  function createIFrameElement(token, mode) {
    const iframeInst = window.OsmosContextsByToken[token];
    const elem = document.createElement('iframe');
    if (mode === 'management') {
      elem.title = 'Osmos Embedded Jobs Table';
      elem.id = 'ftl-table-iframe';
      elem.src = `${URL_PREFIX}/embedded_management_v1.html`;
      elem.style = 'border: none; outline: none; margin: none; width: 100%';
      elem.height = getIframeHeight(window.innerHeight);
    } else {
      elem.title = 'Osmos Embedded File Uploader';
      elem.id = 'ftl-uploader-iframe';
      elem.style = `
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        margin: auto;
        border-radius: 10px;
        outline: none;
        border:
        none;
        z-index: 2147483645;
      `;
      elem.src = `${URL_PREFIX}/embedded_v1.html`;

      elem.height =
        ctx.iframeProps?.height !== undefined
          ? ctx.iframeProps.height
          : getIframeHeight(window.innerHeight);
      elem.width =
        ctx.iframeProps?.width !== undefined
          ? ctx.iframeProps.width
          : getIframeWidth(window.innerWidth);
    }
    elem.addEventListener(
      'load',
      function () {
        if (!elem.contentWindow) {
          console.error(
            '[Osmos] Error when initializing embed iframe: `contentWindow` is not set on the iframe element'
          );
          return;
        }

        if (mode === 'management') {
          elem.contentWindow.postMessage(
            {
              token: iframeInst.token,
              type: 'initManagement',
              userID: iframeInst.userID,
              userGroup: iframeInst.userGroup,
              theme: iframeInst.theme,
            },
            '*'
          );
          return;
        }

        elem.contentWindow.postMessage(
          {
            type: 'init',
            theme: iframeInst.theme,
            hideUploadDescription: iframeInst.hideUploadDescription,
            hideUploadSchema: iframeInst.hideUploadSchema,
            schema: {
              ...iframeInst.schema,
              fields: iframeInst.schema.fields.map((rawField) => {
                const field = { ...rawField };
                if (field.validator) {
                  // Functions can't be sent between windows, so we swap out the actual function for an ID
                  // which we hold onto here.
                  let ix = iframeInst.validators.findIndex(
                    (o) => o === field.validator
                  );
                  if (ix === -1) {
                    iframeInst.validators.push(field.validator);
                    ix = iframeInst.validators.length - 1;
                  }

                  field.validator = ix;
                }

                if (typeof field.validOptions === 'function') {
                  let ix = iframeInst.validOptionsGetters.findIndex(
                    (o) => o === field.validOptions
                  );
                  if (ix === -1) {
                    iframeInst.validOptionsGetters.push(field.validOptions);
                    ix = iframeInst.validOptionsGetters.length - 1;
                  }

                  field.validOptions = ix;
                }

                return field;
              }),
            },
            uploadDescription: iframeInst.uploadDescription,
            token: iframeInst.token,
            devMode: iframeInst.devMode,
            allowSubmissionWithErrors: iframeInst.allowSubmissionWithErrors,
            disableAdvancedMode: iframeInst.disableAdvancedMode,
            hideCSVPreviewPane: iframeInst.hideCSVPreviewPane,
            maxRecords: iframeInst.maxRecords,
            mode,
            enableCustomModelAutomapping:
              iframeInst.enableCustomModelAutomapping,
            autoMapEnabled: iframeInst.autoMapEnabled,
            autoRecallEnabled: iframeInst.autoRecallEnabled,
            storeTransformsForRecall: iframeInst.storeTransformsForRecall,
          },
          '*'
        );

        if (iframeInst.userID) {
          elem.contentWindow.postMessage(
            { type: 'setUserID', userID: iframeInst.userID },
            '*'
          );
        }
        if (iframeInst.userGroup) {
          elem.contentWindow.postMessage(
            { type: 'setUserGroup', userGroup: iframeInst.userGroup },
            '*'
          );
        }
      },
      { once: true }
    );
    window.onmessage = (e) => {
      if (e.data === 'fullScreen') {
        ctx.iframeProps = {
          ...ctx.iframeProps,
          width: '100%',
          height: '100%',
        };
        elem.height = '100%';
        elem.width = '100%';
        elem.style = `
        border-radius: 0px;
      `;
      }

      if (e.data === 'exitFullScreen') {
        ctx.iframeProps = {
          ...ctx.iframeProps,
          width: undefined,
          height: undefined,
        };
        elem.height =
          ctx.iframeProps?.height !== undefined
            ? ctx.iframeProps.height
            : getIframeHeight(window.innerHeight);
        elem.width =
          ctx.iframeProps?.width !== undefined
            ? ctx.iframeProps.width
            : getIframeWidth(window.innerWidth);
        elem.style.inset = '0';
        elem.style.margin = 'auto';
        elem.style.position = 'absolute';
        elem.style.borderRadius = '10px';
        elem.style.outline = 'none';
        elem.style.border = 'none';
      }
    };
    return elem;
  }

  const receiver = {};
  let inst = null;

  // Two user id fields to help with potential typos from embedders
  receiver.configure = function (args) {
    const schema = args.schema;
    const uploadDescription = args.uploadDescription;
    const token = args.token;
    const userID = args.userID;
    const userId = args.userId;
    const userGroup = args.userGroup;
    const devMode = args.devMode;
    const allowSubmissionWithErrors = args.allowSubmissionWithErrors;
    const theme = args.theme;
    const iframeProps = args.iframeProps;

    if (!schema) {
      alert(
        'The `schema` property must be provided when configuring Osmos uploader embed'
      );
      return;
    } else if (!token) {
      alert(
        'The `token` property must be provided when configuring Osmos uploader embed'
      );
      return;
    }

    ctx.schema = schema;
    ctx.uploadDescription = uploadDescription || '';
    ctx.token = token;
    ctx.devMode = devMode;
    ctx.allowSubmissionWithErrors = allowSubmissionWithErrors;
    ctx.theme = theme;
    ctx.disableAdvancedMode = args.disableAdvancedMode;
    ctx.hideCSVPreviewPane = args.hideCSVPreviewPane;
    ctx.maxRecords = args.maxRecords || MAX_RECORDS;
    ctx.hideUploadDescription = args.hideUploadDescription || false;
    ctx.hideUploadSchema = args.hideUploadSchema || false;
    ctx.completionHandler = args.completionHandler;
    ctx.enableCustomModelAutomapping = !!args.enableCustomModelAutomapping;
    ctx.autoMapEnabled =
      'autoMapEnabled' in args ? !!args.autoMapEnabled : true;
    ctx.autoRecallEnabled =
      'autoRecallEnabled' in args ? !!args.autoRecallEnabled : true;
    ctx.storeTransformsForRecall =
      'storeTransformsForRecall' in args
        ? !!args.storeTransformsForRecall
        : true;

    ctx.iframeProps = iframeProps;

    if (userID) {
      ctx.userID = userID;
    } else if (userId) {
      ctx.userID = userId;
    }
    if (userGroup) {
      ctx.userGroup = userGroup;
    }

    window.OsmosContextsByToken[token] = { ...ctx };
  };

  ctx.setUserID = function (userID) {
    ctx.userID = userID;
    if (ctx.iframeElement) {
      ctx.iframeElement.contentWindow.postMessage(
        { type: 'setUserID', userID },
        '*'
      );
    }
  };

  ctx.setUserGroup = function (userGroup) {
    ctx.userGroup = userGroup;
    if (ctx.iframeElement) {
      ctx.iframeElement.contentWindow.postMessage(
        { type: 'setUserGroup', userGroup },
        '*'
      );
    }
  };

  ctx.showNavigateAwayModal = function () {
    const iframe = document.querySelector('#ftl-uploader-iframe');
    if (iframe?.contentWindow?.document) {
      const closeBtn =
        iframe.contentWindow.document.getElementById('close-button');
      if (closeBtn) closeBtn.click();
    }
  };

  ctx.closeOverlay = function () {
    if (!ctx.iframeElement) {
      console.warn(
        "[Osmos] Tried to close overlay when it apparently isn't open"
      );
      return;
    }

    if (ctx.resizeHandlerCb) {
      window.removeEventListener('resize', ctx.resizeHandlerCb);
      ctx.resizeHandlerCb = null;
    }

    const body = document.getElementsByTagName('body')[0];
    ctx.backdropElement.removeChild(ctx.iframeElement);
    body.removeChild(ctx.backdropElement);
    ctx.iframeElement = null;
    ctx.backdropElement = null;
  };

  ctx.initOverlay = function (token, mode) {
    if (ctx.iframeElement || ctx.backdropElement) {
      console.warn(
        '[Osmos] Tried to display overlay when overlay is apparently already open'
      );
      return;
    }

    ctx.iframeElement = createIFrameElement(token, mode);
    ctx.backdropElement = createBackdropElement();
    const body = document.getElementsByTagName('body')[0];
    body.appendChild(ctx.backdropElement);
    ctx.backdropElement.appendChild(ctx.iframeElement);

    // Show navigating away modal when you press escape key.
    window.addEventListener('keydown', function (evt) {
      if (evt.key === 'Escape') {
        ctx.showNavigateAwayModal();
      }
    });

    // Show navigating away when you click out of the modal box.
    const overlayElement = document.getElementById('ftl-uploader-backdrop');
    if (overlayElement) {
      overlayElement.onclick = function (evt) {
        if (
          evt.target &&
          // eslint-disable-next-line eqeqeq
          evt.target != document.getElementById('ftl-uploader-iframe')
        ) {
          ctx.showNavigateAwayModal();
        }
      };
    }

    ctx.eventHandlerCb = async function (evt) {
      if (typeof evt.data !== 'object') {
        return;
      }

      async function callCompletionHandler() {
        if (ctx.completionHandler) {
          const params = {
            originalFileUrl: evt.data.filePath
              ? `${API_PREFIX}/uploader/original_file/${evt.data.filePath}`
              : undefined,
            reachedTransformStep: evt.data.reachedTransformStep ?? false,
            successfullySubmittedData:
              evt.data.successfullySubmittedData ?? false,
            numRecordsSubmitted: evt.data.numRecordsSubmitted ?? 0,
            skippedRowNumbers: evt.data.skippedRowNumbers ?? [],
            jobId: evt.data.jobId ?? '',
          };
          await ctx.completionHandler(params);
        }
      }

      switch (evt.data.type) {
        case 'completionHandler': {
          callCompletionHandler();
          break;
        }
        case 'close': {
          // Close button clicked from within the iframe
          ctx.closeOverlay();
          break;
        }
        case 'open': {
          // When clicked on upload another file, this will keep uploader open but will execute the completionHandler
          ctx.closeOverlay();
          receiver.handleClick(evt.data.token);
          break;
        }
        case 'validate': {
          const validatorIndex = evt.data.validatorIndex;
          const validationID = evt.data.validationID;
          const rows = evt.data.rows;

          if (
            typeof validatorIndex !== 'number' ||
            typeof validationID !== 'number' ||
            !Array.isArray(rows)
          ) {
            console.error(
              'Invalid validation request params provided: ',
              evt.data
            );
            return;
          }

          const validator = ctx.validators[validatorIndex];
          if (!validator) {
            console.error(
              'No validator registered with index=',
              validatorIndex
            );
            return;
          }

          try {
            // Run the user-provided validation function
            const validationOutput = await validator(rows);
            ctx.iframeElement.contentWindow.postMessage(
              {
                type: 'validationResult',
                validationID,
                validationOutput,
              },
              '*'
            );
          } catch (err) {
            console.error(
              'User-provided validator function threw an error: ',
              err
            );
            // TODO: Handle this somehow without locking up the transform builder for the user?
            ctx.iframeElement.contentWindow.postMessage(
              {
                type: 'validationResult',
                validationID,
                // Treat everything as valid if there was an error in the custom user-provided validation function
                validationOutput: rows.map(() => true),
              },
              '*'
            );
          }

          break;
        }
        case 'getValidOptions': {
          const { fnIx, callbackToken, valsForRow } = evt.data;
          const getter = ctx.validOptionsGetters[fnIx];

          try {
            const validOptions = await getter(valsForRow);
            ctx.iframeElement.contentWindow.postMessage(
              {
                type: 'getValidOptionsResult',
                callbackToken,
                validOptions,
              },
              '*'
            );
          } catch (err) {
            console.error(
              'Error calling user-provided valid options getter: ',
              err
            );
            ctx.iframeElement.contentWindow.postMessage(
              {
                type: 'getValidOptionsResult',
                callbackToken,
                validOptions: [],
              },
              '*'
            );
          }
          break;
        }
        default: {
          // ignore unknown events
        }
      }
    };
    window.addEventListener('message', ctx.eventHandlerCb);

    ctx.resizeHandlerCb = mkResizeHandler(ctx);
    window.addEventListener('resize', ctx.resizeHandlerCb);
  };

  ctx.initManagementOverlay = function (token) {
    if (ctx.iframeElement || ctx.eventHandlerCb) {
      console.warn(
        '[Osmos] Tried to create new table view when table view is already open'
      );
      return;
    }

    ctx.iframeElement = createIFrameElement(token, 'management');
    // check for osmos-table for back compatibility purposes, in case id is not set
    const wrapper =
      document.getElementById(token) ?? document.getElementById('osmos-table');
    wrapper.appendChild(ctx.iframeElement);

    ctx.resizeHandlerCb = mkResizeHandler(ctx);
    window.addEventListener('resize', ctx.resizeHandlerCb);
  };

  // for loading a single table
  receiver.loadTable = function (token) {
    inst = window.OsmosContextsByToken[token];
    for (var key in ctx) {
      if (ctx.hasOwnProperty(key)) {
        delete ctx[key];
      }
    }
    Object.assign(ctx, inst);

    ctx.initManagementOverlay(token);
  };

  // for loading multiple tables
  receiver.loadTables = function () {
    const tableElements = document.getElementsByClassName('osmos-table');
    [...tableElements].forEach(({ id: token }) => {
      inst = window.OsmosContextsByToken[token];
      for (var key in ctx) {
        if (ctx.hasOwnProperty(key)) {
          delete ctx[key];
        }
      }
      Object.assign(ctx, inst);

      ctx.initManagementOverlay(token);
    });
  };

  receiver.handleClick = function (token, mode) {
    if (!token) {
      console.warn(
        '[Osmos] No token argument found in `handleClick` call; consider updating your uploader snippet with the latest code from the Osmos web app'
      );
    } else if (typeof token !== 'string') {
      console.warn(
        '[Osmos] Invalid token provided to `handleClick`; expected string, found: ',
        token
      );
      token = undefined;
    }

    // Backwards compatible to older versions that didn't have a provided `token`
    if (token) {
      inst = window.OsmosContextsByToken[token];
    } else {
      inst = Object.values(window.OsmosContextsByToken)[0];
    }
    // Using `Object.assign` here ensures that the `ctx` variable stays referrentially equal, so even if it is
    // captured by various closures, switching the active instance here will still work.
    for (var key in ctx) {
      if (ctx.hasOwnProperty(key)) {
        delete ctx[key];
      }
    }
    Object.assign(ctx, inst);
    ctx.initOverlay(token, mode);
  };

  return receiver;
})();

window.FortyTwoLayers = window.Osmos;
