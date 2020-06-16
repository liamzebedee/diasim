import { MINUTE, functions } from "./Simulation"
import { compose } from './utils'
import _ from 'lodash'
const luxon = require('luxon')

export class InsulinPumpModel {
    bolusRatios = []
    basalRatios = []
    correctionRatios = []

    constructor(opts) {
        Object.assign(this, opts)
    }

    getBolusRatio(hour) {
        return intervalSearch(this.bolusRatios, hour)
    }

    getBasalRate(hour) {
        return intervalSearch(this.basalRatios, hour)
    }

    getCorrectionRatio(hour) {
        return intervalSearch(this.correctionRatios, hour)
    }
}

function intervalSearch(intervals, x) {
    let y = _.last(intervals)
    for(let [bound, value] of intervals) {
        if(x > bound) y = value
    }
    return y
}

export function parseRatios(str) {
    return str.split('\n').filter(x => !!x).map(str => {
        let [time, value] = str.split(' ')
        // time is formatted hh.mm
        const [hh,mm] = time.split('.').map(x => parseInt(x))
        // 6.30 would be converted to 6.5
        const bound = hh + (mm / 60.)
        
        value = parseFloat(value)
        return [bound, value]
    })
}



