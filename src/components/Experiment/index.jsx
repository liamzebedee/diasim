import { useEffect, useState, Component, useReducer } from 'react';
import ReactDOM from 'react-dom'
import _ from 'lodash'
import chrono from 'chrono-node'
import DateTime from 'react-datetime'
import { Textarea, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, NumberInput, Stack, FormControl, FormLabel, CSSReset, Heading, Box, Flex } from "@chakra-ui/core";
import { Select, Button } from "@chakra-ui/core";

import latestGlucoseFeed from '../../../data/glucose.json'
import { Model } from '../../model/Simulation'
import { BodyMetabolismModel } from '../../model/BodyMetabolismModel';
import { parseRatios, InsulinPumpModel } from '../../model/InsulinPumpModel'
import { eventToFunction, parseEvents } from '../../model/event_parsing';
import { Plot, toPlotlyFormat, formatPlotlyDate } from '../../helpers/plotly'
import { FunctionPlots } from '../FunctionPlots'
import { 
    debouncedOnChange,
    debouncedOnChangeNumberInput,
    debouncedDatetimeOnchange
} from '../../helpers/form'
import { convertFromMgToMmol } from '../../model/utils';

// Convert American glucose units.
export function convertRawGlucoseFeed(d) {
    return d
        .map(d => {
            return {
                ...d,
                date: d.date,
                sgv: convertFromMgToMmol(d.sgv)
            }
        })
        .reverse()
}

function getStartDate(fromTo) {
    let date
    if(!fromTo[0]) {
        date = null
    } else {
        date = new Date(fromTo[0])
    }
    return date
}

function getEndDate(fromTo) {
    let date
    if(!fromTo[1]) {
        date = null
    } else {
        date = new Date(fromTo[1])
    }
    return date
}

function getData(glucoseFeed, fromTo, events, model) {
    // Convert data from raw NightScout JSON.
    let observed = convertRawGlucoseFeed(glucoseFeed)

    let observed1 = observed
    
    // Filter between fromTo, if it's configured. 
    if(fromTo.length == 2) {
        let [from,to] = fromTo
        console.debug(`from=${from} to=${to}`)
        observed1 = observed.filter(entry => {
            return (entry.date >= from) && (entry.date <= to)
        })
    }

    // Run simulation.
    const intoFuture = 0
    let predicted = Model.simulate(observed1, intoFuture, events.map(eventToFunction), model)

    // Convert to Plotly format.
    return {
        observed: toPlotlyFormat(observed),
        predicted: toPlotlyFormat(predicted)
    }
}

export const Experiment = () => {
    const [annotations, setAnnotations] = useState([])
    const [fromTo, setFromTo] = useState([])

    // ew gross
    const [glucoseFeed, setGlucoseFeed] = useState(latestGlucoseFeed)
    const [observed, setObserved] = useState([])
    const [predicted, setPredicted] = useState([])
    const [eventsText, setEventsText] = useState('')

    // Body metabolism model.
    const [insulinSensitivity, setInsulinSensitivity] = useState(-1.8)
    const [carbSensitivity, setCarbSensitivity] = useState(0.27)

    // Insulin pump settings model.
    const [bolusText, setBolus] = useState(`00.00 11g\n06.00 7g\n10.00 11g`)
    const [basalText, setBasal] = useState('00.00 0.75\n08.00 0.60\n21.00 0.75')
    const [correctionText, setCorrection] = useState(`00.00 2.5\n06.00 2.2`)

    useEffect(() => {
        loadExperiments()
    }, [])

    const [stats, setStats] = useState({
        totalInsulin: 0,
        totalCarbs: 0,
        startBG: 0,
        endBG: 0,
        deltaBG: 0,
        events: []
    })

    useEffect(() => {
        let events
        try {
            const bolusRatios = parseRatios(bolusText)
            const basalRatios = parseRatios(basalText)
            const correctionRatios = parseRatios(correctionText)

            console.log(bolusRatios, basalRatios, correctionRatios)
            
            // Parse insulin pump model settings.
            const insulinPumpModel = new InsulinPumpModel({
                bolusRatios,
                basalRatios,
                correctionRatios
            })

            // Parse events.
            events = parseEvents(eventsText, insulinPumpModel)
            console.log(events.filter(x => x.type == 'insulin'))
            const totalInsulin = events.filter(x => x.type == 'insulin').reduce((prev, curr) => {
                return prev + curr.amount
            }, 0)
            const totalCarbs = events.filter(x => x.type == 'food').reduce((prev, curr) => {
                return prev + curr.amount
            }, 0)

            setStats({
                totalInsulin,
                totalCarbs,
                events,
            })

            const { observed, predicted } = getData(
                glucoseFeed, fromTo, events,
                new BodyMetabolismModel({
                    insulinSensitivity: parseFloat(insulinSensitivity),
                    carbSensitivity: parseFloat(carbSensitivity)
                })
            )
            setObserved(observed)
            setPredicted(predicted)

            // Find the start, end BG's.
            // 

            // TODO: this could be cleaner.
            function getBG(record) { return record[1] }
            let startBG = getBG(observed[0])
            let endBG = getBG(_.last(observed))
            
            if(fromTo[0]) {
                for(let [date, sgv] of observed) {
                    if((new Date(date)) > fromTo[0]) {
                        startBG = sgv
                        break
                    }
                }
            }
            if(fromTo[1]) {
                for(let [date, sgv] of observed.slice().reverse()) {
                    if((new Date(date)) > fromTo[1]) {
                        endBG = sgv
                        break
                    }
                }
            }
            const deltaBG = endBG - startBG

            setStats({
                totalInsulin,
                totalCarbs,
                events,

                startBG,
                endBG,
                deltaBG
            })
        } catch(ex) {
            console.log(ex)
            // didn't validate
            return
        }
    }, [glucoseFeed, fromTo, eventsText, insulinSensitivity, carbSensitivity, bolusText, basalText, correctionText])

    function clearTimeFilter() {
        setFromTo([])
    }

    const [experiments, setExperiments] = useState([])
    
    function saveExperiment() {
        // Save the experiment for later viewing.
        // - observed data
        // - events
        // - fromTo

        const experiment = {
            glucoseFeed, observed, eventsText, fromTo
        }
        const experiments1 = [...experiments, experiment]
        
        setExperiments(experiments1)
        localStorage.setItem('experiments', JSON.stringify(experiments1))
    }

    function loadExperiments() {
        let d = localStorage.getItem('experiments') || '[]'
        let d2 = JSON.parse(d)
        setExperiments(
            d2
        )
    }

    function loadExperiment(i) {
        if(!i) {
            setGlucoseFeed(latestGlucoseFeed)
            setObserved([])
            setEventsText('')
            setFromTo([])
            return
        } // The <select> title was clicked.

        let { glucoseFeed, observed, eventsText, fromTo } = experiments[i]
        setGlucoseFeed(glucoseFeed)
        // setObserved(observed)
        setEventsText(eventsText)
        setFromTo(fromTo)
    }
    
    return <Box p="5">
        <Flex align="center">
            <Heading as="h5" size="sm">
                Experiments
            </Heading>
            <Stack shouldWrapChildren isInline>
                <Select size="sm" placeholder="Choose experiment..." onChange={ev => loadExperiment(ev.target.value)}>
                    {
                        experiments.map((experiment, i) => {
                            return <option key={i} value={`${i}`}>Experiment {i}</option>
                        })
                    }
                </Select>
                <Button size="sm" variantColor="green" onClick={saveExperiment}>Save</Button>
            </Stack>
        </Flex>

        <Flex align="center">
            <Flex align="left">
            <Plot
                onClick={(ev) => {
                    const { points } = ev
                    // Get the clicked point on the line.
                    const { x,y } = points[0]

                    const fromToStack = fromTo.slice() // clone
                    fromToStack.push((new Date(x)).getTime()) // x is time
                    
                    const recent = fromToStack.slice(-2)
                    
                    setFromTo(_.sortBy(recent)) // use only recent two items

                    setAnnotations(annotations.concat({
                        x,y
                    }))
                }}
                data={[
                    {
                        x: observed.map(a => a[0]),
                        y: observed.map(a => a[1]),
                        type: 'scatter',
                        name: 'real',
                        mode: 'lines+markers',
                        marker: { color: 'black' },
                    },
                    {
                        x: predicted.map(a => a[0]),
                        y: predicted.map(a => a[1]),
                        name: 'predicted',
                        type: 'scatter',
                        mode: 'lines',
                        marker: { color: 'blue' },
                    }
                ]}
                layout={{ 
                    width: 1024, 
                    height: 720, 
                    title: 'Blood glucose',
                    xaxis: {
                        autorange: true,
                        title: 'Time'
                    },
                    yaxis: {
                        range: [1, 20],
                        title: 'BGL'
                    },
                    annotations: [
                        ...stats.events.map(event => {
                            return {
                                x: formatPlotlyDate(new Date(event.start)),
                                y: 4,
                                // y: observed.
                                xref: 'x',
                                yref: 'y',
                                text: `${({
                                    'food': "🍎",
                                    'insulin': "💉",
                                    'exercise': "🏃‍♂️"
                                })[event.type]} ${{
                                    'correct': 'C',
                                    'bolus': 'B',
                                    '': ''
                                }[event.intent || '']}`,
                                showarrow: false,
                                // arrowhead: 7,
                                // ax: 0,
                                ay: -40
                            }
                        })
                    ],
                }}
            />
            </Flex>

            <Flex flexGrow={1} align="right" flexDirection="column" align="top">
                <Heading as="h5" size="md">
                    Experiment
                </Heading>
                
                <Stack shouldWrapChildren isInline>
                    <FormControl>
                        <FormLabel htmlFor="start-time">Start time</FormLabel>
                        <DateTime name="start-time"
                            value={getStartDate(fromTo)}
                            onChange={debouncedDatetimeOnchange(val => {
                                let updatedFromTo = fromTo.slice()
                                updatedFromTo[0] = val._d.getTime()
                                setFromTo(updatedFromTo)
                            })}/>
                    </FormControl>

                    <FormControl>
                        <FormLabel htmlFor="end-time">End time</FormLabel>
                        <DateTime name="end-time"
                            value={getEndDate(fromTo)}
                            onChange={debouncedDatetimeOnchange(val => {
                                let updatedFromTo = fromTo.slice()
                                updatedFromTo[1] = val._d.getTime()
                                setFromTo(updatedFromTo)
                            })}/>
                    </FormControl>
                </Stack>
                
                <FormControl>
                    <FormLabel htmlFor="events">Events</FormLabel>
                    <Textarea
                        height={120}
                        id='events'
                        defaultValue={eventsText}
                        onChange={debouncedOnChange(setEventsText)}
                        placeholder="Here is a sample placeholder"
                        size="md"
                    />
                </FormControl>

                <Flex align="right" flexDirection="row">
                    <span><b>Start BG</b>: {(stats.startBG || 0).toFixed(1)}mmol</span>
                    <Box paddingRight="5"></Box>
                    <span><b>End BG</b>: {(stats.endBG || 0).toFixed(1)}mmol</span>
                    <Box paddingRight="5"></Box>
                    <span><b>Δ BG</b>: {(stats.deltaBG || 0) > 1 ? '+' : '-'}{(stats.deltaBG || 0).toFixed(1)}mmol</span>
                    <Box paddingRight="5"></Box>
                    <span><b>Total insulin</b>: {stats.totalInsulin.toFixed(2)}U</span>
                    <Box paddingRight="5"></Box>
                    <span><b>Total carbs</b>: {stats.totalCarbs}g</span>
                </Flex>
                
                <FormControl>
                    <FormLabel htmlFor="bolus-ratios">Bolus ratios</FormLabel>
                    <Textarea
                        height={110}
                        id='bolus-ratios'
                        defaultValue={bolusText}
                        onChange={debouncedOnChange(setBolus)}
                        placeholder="12.00 10g"
                        size="md"
                    />
                </FormControl>

                <FormControl>
                    <FormLabel htmlFor="basal-ratios">Basal ratios</FormLabel>
                    <Textarea
                        height={110}
                        id='basal-ratios'
                        defaultValue={basalText}
                        onChange={debouncedOnChange(setBasal)}
                        placeholder="12.00 0.6"
                        size="md"
                    />
                </FormControl>

                <FormControl>
                    <FormLabel htmlFor="basal-ratios">Correction ratios</FormLabel>
                    <Textarea
                        height={110}
                        id='correction-ratios'
                        defaultValue={correctionText}
                        onChange={debouncedOnChange(setCorrection)}
                        placeholder="12.00 1.8"
                        size="md"
                    />
                </FormControl>
                
                <div>
                    <label><strong>Time filter</strong>: { fromTo.length == 2 ? 'set' : 'unset' }</label>
                    <Button size="sm" onClick={clearTimeFilter}>Clear</Button>
                </div>

                <Stack shouldWrapChildren isInline>
                    <FormControl>
                        <FormLabel htmlFor="carb-sensitivity">🍎 Carb. sensitivity (15g : x mmol)</FormLabel>
                        <NumberInput 
                            id="carb-sensitivity" size="sm" defaultValue={carbSensitivity} precision={2} step={0.01} 
                            onChange={debouncedOnChangeNumberInput(x => setCarbSensitivity(parseFloat(x)))}>
                            <NumberInputField />
                            <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </FormControl>

                    <FormControl>
                        <FormLabel htmlFor="insulin-sensitivity">💉 Insulin sensitivity (1U : x mmol)</FormLabel>
                        <NumberInput size="sm" defaultValue={insulinSensitivity} precision={1} min={-10} step={0.1} max={0}
                            onChange={debouncedOnChangeNumberInput(x => setInsulinSensitivity(parseFloat(x)))}>
                            <NumberInputField />
                            <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </FormControl>

                    {/* <FormControl>
                        <FormLabel htmlFor="carb-sensitivity">💉⏱ Insulin active</FormLabel>
                        <NumberInput size="sm" defaultValue={model.insulinActive} precision={1} min={0} step={0.1}
                            onChange={v => {
                                setModel({ ...model, insulinActive: parseFloat(v) })
                            }}>
                            <NumberInputField />
                            <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </FormControl> */}
                </Stack>
            </Flex>
        </Flex>
        
        <FunctionPlots/>
    </Box>
}