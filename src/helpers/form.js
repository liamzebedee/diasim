import _ from 'lodash'
import { convertFromMgToMmol } from '../model/utils'

export function debouncedOnChange(setter) {
    const debounced = _.debounce(setter, 150)
    return e => {
        debounced(e.target.value)
    }
}

export function debouncedOnChangeNumberInput(setter) {
    const debounced = _.debounce(setter, 250)
    return e => {
        debounced(e)
    }
}

export function debouncedDatetimeOnchange(setter) {
    const debounced = _.debounce(setter, 500)
    return e => {
        debounced(e)
    }
}