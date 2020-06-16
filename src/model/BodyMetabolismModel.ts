export class BodyMetabolismModel {
    public insulinSensitivity
    public carbSensitivity
    public insulinActive

    constructor(opts) {
        Object.assign(this, opts)
    }

    // Insulin sensitivity is the ratio of 1 insulin unit : x mmol blood glucose reduction.
    getInsulinSensitivity(): number {
        return this.insulinSensitivity
    }

    // Carb sensitivity is the ratio of 1g of carbs raising x mmol.
    getCarbSensitivty(): number {
        return this.carbSensitivity
    }
}