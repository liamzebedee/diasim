export function convertFromMgToMmol(v) {
    return v / 18.
}

// Functional enhancer.
export const compose = (...fns) =>
    fns.reduceRight((prevFn, nextFn) =>
        (...args) => nextFn(prevFn(...args)),
        value => value
    )
;