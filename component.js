/* eslint-env browser */

import * as dom from './dom.js'
import * as diff from './diff.js'
import * as object from './object.js'
import * as json from './json.js'
import * as string from './string.js'

export const registry = customElements

/**
 * @param {string} name
 * @param {function} constr
 * @param {ElementDefinitionOptions} [opts]
 */
export const define = (name, constr, opts) => registry.define(name, constr, opts)

/**
 * @param {string} name
 * @return Promise
 */
export const whenDefined = name => registry.whenDefined(name)

const upgradedEventName = 'upgraded'

/**
 * @template S
 */
export class Lib0Component extends HTMLElement {
  /**
   * @param {S} state
   */
  constructor (state) {
    super()
    this.state = state
  }

  /**
   * @param {S} state
   */
  setState (state) {}
  /**
    * @param {any} stateUpdate
    */
  updateState (stateUpdate) { }
}

/**
 * @param {any} val
 * @param {"json"|"string"|"number"} type
 * @return {string}
 */
const encodeAttrVal = (val, type) => {
  if (type === 'json') {
    val = json.stringify(val)
  }
  return val + ''
}

/**
 * @param {any} val
 * @param {"json"|"string"|"number"|"bool"} type
 * @return {any}
 */
const parseAttrVal = (val, type) => {
  switch (type) {
    case 'json':
      return json.parse(val)
    case 'number':
      return Number.parseFloat(val)
    case 'string':
      return val
    case 'bool':
      return val != null
    default:
      return null
  }
}

/**
 * @typedef {Object} CONF
 * @property {string?} [CONF.template] Template for the shadow dom.
 * @property {string} [CONF.style] shadow dom style. Is only used when
 * `CONF.template` is defined
 * @property {S} [CONF.state] Initial component state.
 * @property {function(S,S|null,Lib0Component<S>):void} [CONF.onStateChange] Called when
 * the state changes.
 * @property {Object<string,function(any):Object>} [CONF.childStates] maps from
 * CSS-selector to transformer function. The first element that matches the
 * CSS-selector receives state updates via the transformer function.
 * @property {Object<string,"json"|"number"|"string"|"bool">} [CONF.attrs]
 * attrs-keys and state-keys should be camelCase, but the DOM uses kebap-case. I.e.
 * `attrs = { myAttr: 4 }` is represeted as `<my-elem my-attr="4" />` in the DOM
 * @property {Object<string, function(CustomEvent, Lib0Component<any>):boolean|void>} [CONF.listeners] Maps from dom-event-name
 * to event listener.
 * @property {function(S):Object<string,string>} [CONF.slots] Fill slots
 * automatically when state changes. Maps from slot-name to slot-html.
 * @template S
 */

/**
 * @param {string} name
 * @param {CONF<T>} cnf
 *
 * @template T
 */
export const createComponent = (name, { template, style = '', state, onStateChange = () => {}, childStates = { }, attrs = {}, listeners = {}, slots = () => ({}) }) => {
  /**
   * Maps from camelCase attribute name to kebap-case attribute name.
   * @type {Object<string,string>}
   */
  const normalizedAttrs = {}
  for (const key in attrs) {
    normalizedAttrs[string.fromCamelCase(key, '-')] = key
  }
  const templateElement = template ? /** @type {HTMLTemplateElement} */ (dom.parseElement(`
    <template>
      <style>${style}</style>
      ${template}
    </template>
  `)) : null

  class Lib0Component extends HTMLElement {
    constructor () {
      super()
      /**
       * @type {Array<{d:Lib0Component, s:function(any):Object}>}
       */
      this._childStates = []
      this._init = false
      /**
       * @type {any}
       */
      this.state = /** @type {any} */ (object.assign({}, state))
      // init shadow dom
      if (templateElement) {
        const shadow = /** @type {ShadowRoot} */ (this.attachShadow({ mode: 'open' }))
        shadow.appendChild(templateElement.content.cloneNode(true))
        // fill child states
        for (const key in childStates) {
          this._childStates.push({
            d: /** @type {Lib0Component} */ (dom.querySelector(/** @type {any} */ (shadow), key)),
            s: childStates[key]
          })
        }
      }
      dom.emitCustomEvent(this, upgradedEventName, { bubbles: true })
    }

    connectedCallback () {
      if (!this._init) {
        this._init = true
        const shadow = this.shadowRoot
        if (shadow) {
          dom.addEventListener(shadow, upgradedEventName, event => {
            this.setState(this.state, true)
            event.stopPropagation()
          })
        }
        const startState = this.state
        if (attrs) {
          for (const key in attrs) {
            const normalizedKey = string.fromCamelCase(key, '-')
            const val = parseAttrVal(this.getAttribute(normalizedKey), attrs[key])
            if (val) {
              startState[key] = val
            }
          }
        }
        // add event listeners
        for (const key in listeners) {
          dom.addEventListener(shadow || this, key, event => {
            if (listeners[key](/** @type {CustomEvent} */ (event), this) !== false) {
              event.stopPropagation()
              event.preventDefault()
              return false
            }
          })
        }
        // first setState call
        this.state = null
        this.setState(startState)
      }
    }

    disconnectedCallback () {
      this.setState(null)
    }

    static get observedAttributes () {
      return object.keys(normalizedAttrs)
    }

    /**
     * @param {string} name
     * @param {string} oldVal
     * @param {string} newVal
     *
     * @private
     */
    attributeChangedCallback (name, oldVal, newVal) {
      const curState = /** @type {object} */ (this.state)
      const camelAttrName = normalizedAttrs[name]
      const type = attrs[camelAttrName]
      const parsedVal = parseAttrVal(newVal, type)
      if ((type !== 'json' || json.stringify(curState[camelAttrName]) !== newVal) && curState[camelAttrName] !== parsedVal) {
        this.updateState({ [camelAttrName]: parsedVal })
      }
    }

    /**
     * @param {any} stateUpdate
     */
    updateState (stateUpdate) {
      this.setState(object.assign({}, this.state, stateUpdate))
    }

    /**
     * @param {any} state
     */
    setState (state, forceStateUpdates = false) {
      const prevState = this.state
      this.state = state
      if (this._init && (state !== prevState || forceStateUpdates)) {
        // fill slots
        const slotElems = slots(state)
        for (const key in slotElems) {
          const currentSlot = dom.querySelector(this, `[slot="${key}"]`)
          const nextSlot = dom.parseElement(slotElems[key])
          nextSlot.setAttribute('slot', key)
          if (currentSlot) {
            dom.replaceWith(currentSlot, nextSlot)
          } else {
            dom.appendChild(this, nextSlot)
          }
        }
        onStateChange(state, prevState, this)
        this._childStates.forEach(cnf => {
          const d = cnf.d
          if (d.updateState) {
            d.updateState(cnf.s(state))
          }
        })
        for (const key in attrs) {
          const normalizedKey = string.fromCamelCase(key, '-')
          const stateVal = state[key]
          const attrsType = attrs[key]
          if (!prevState || prevState[key] !== stateVal) {
            if (attrsType === 'bool') {
              if (stateVal) {
                this.setAttribute(normalizedKey, '')
              } else {
                this.removeAttribute(normalizedKey)
              }
            } else {
              this.setAttribute(normalizedKey, encodeAttrVal(stateVal, attrsType))
            }
          }
        }
      }
    }
  }
  define(name, Lib0Component)
  return Lib0Component
}

/**
 * @param {function} definer function that defines a component when executed
 */
export const createComponentDefiner = definer => {
  /**
   * @type {any}
   */
  let defined = null
  return () => {
    if (!defined) {
      defined = definer()
    }
    return defined
  }
}

export const defineListComponent = createComponentDefiner(() => {
  const ListItem = createComponent('lib0-list-item', {
    template: '<slot name="content"></slot>',
    slots: state => ({
      content: `<div>${state}</div>`
    })
  })
  return createComponent('lib0-list', {
    state: { list: /** @type {Array<string>} */ ([]), Item: ListItem },
    onStateChange: ({ list = /** @type {Array<any>} */ ([]), Item = ListItem }, prevState, component) => {
      let { index, remove, insert } = diff.simpleDiffArray(prevState ? prevState.list : [], list)
      if (remove === 0 && insert.length === 0) {
        return
      }
      let child = /** @type {Lib0Component<any>} */ (component.firstChild)
      while (index-- > 0) {
        child = /** @type {Lib0Component<any>} */ (child.nextElementSibling)
      }
      let insertStart = 0
      while (insertStart < insert.length && remove-- > 0) {
        // update existing state
        child.setState(insert[insertStart++])
        child = /** @type {Lib0Component<any>} */ (child.nextElementSibling)
      }
      while (remove-- > 0) {
        // remove remaining
        const prevChild = child
        child = /** @type {Lib0Component<any>} */ (child.nextElementSibling)
        component.removeChild(prevChild)
      }
      // insert remaining
      component.insertBefore(dom.fragment(insert.slice(insertStart).map(insState => {
        const el = new Item()
        el.setState(insState)
        return el
      })), child)
    }
  })
})

export const defineLazyLoadingComponent = createComponentDefiner(() => createComponent('lib0-lazy', {
  state: /** @type {{component:null|String,import:null|function():Promise<any>,state:null|object}} */ ({
    component: null, import: null, state: null
  }),
  attrs: {
    component: 'string'
  },
  onStateChange: ({ component, state, import: getImport }, prevState, componentEl) => {
    if (component !== null) {
      if (getImport) {
        getImport()
      }
      if (!prevState || component !== prevState.component) {
        const el = /** @type {any} */ (dom.createElement(component))
        componentEl.innerHTML = ''
        componentEl.insertBefore(el, null)
      }
      const el = /** @type {any} */ (componentEl.firstElementChild)
      // @todo generalize setting state and check if setState is defined
      if (el.setState) {
        el.setState(state)
      }
    }
  }
}))
