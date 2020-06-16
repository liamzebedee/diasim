import { Plot } from '../../helpers/plotly'
import { MINUTE, HOUR, functions } from '../../model/Simulation'
import { compose } from '../../model/utils'

const FunctionPlot = ({ fn, duration, id, title }) => {
    const STEP = 1*MINUTE
    
    let xv = []
    let yv = []
    for(let x = 0; x < duration; x += STEP) {
        // normalise x axis to showing minutes
        xv.push(x/HOUR)
        yv.push(fn(x))
    }

    return <>
        <Plot
            layout={{
                title
            }}
            data={[
                {
                    x: xv,
                    y: yv,
                    type: 'scatter',
                    name: `fnplot-${id}`,
                    mode: 'lines',
                    marker: { color: 'black' },
                },
            ]}
        />
    </>
}

const testing = compose(
    functions.foodDigestionEffect(
        functions.foodDigestion('carbs', 40, 51 / 100)
    ),
    functions.beginsAfter({
        start: 0,
    })
)

const exerciseFn = compose(
    functions.exercise(0.8),
    functions.window({
        start: 0,
        duration: 30*MINUTE
    })
)
const insulinActive = functions.fiaspInsulinActive(1)
const foodDigestionCarbs = functions.foodDigestion('carbs', 30, 0.5)
const foodDigestionProtein = functions.foodDigestion('protein', 30)
const basal = functions.basalEffect(0.7)

export const FunctionPlots = () => {
    return <>
        <FunctionPlot title="Testing" id='testing' fn={testing} duration={6*HOUR}/>
        <FunctionPlot title="Exercise (80% intensity, duration 30mins)" id='exercise' fn={exerciseFn} duration={2*HOUR}/>
        <FunctionPlot title="Fiasp insulin active" id='insulin' fn={insulinActive} duration={7*HOUR}/>
        <FunctionPlot title="Food digestion (30g - Carbs)" id='insulin' fn={foodDigestionCarbs} duration={7*HOUR}/>
        <FunctionPlot title="Food digestion (30g - Protein)" id='insulin' fn={foodDigestionProtein} duration={7*HOUR}/>
        <FunctionPlot title="Basal rate" id='basal' fn={basal} duration={5*HOUR}/>
    </>
}