import dynamic from 'next/dynamic';

export function formatPlotlyDate(dateObj) {
    let date, time
    let str = dateObj.toLocaleString().split(', ')
    // 2020-05-13 22:14
    date = str[0].split('/').reverse().join('-')
    time = str[1].substring(0,5)
    // console.log(date, time)
    return `${date} ${time}`
}

export function toPlotlyFormat(glucoseFeed) {
    // convert glucose data to x,y
    return glucoseFeed.map((record, i) => {
        // x
        let date = new Date(record.date)
        // const x = i
        const x = formatPlotlyDate(date)

        // y
        const y = record.sgv

        return [x,y]
    })
}

// Make Plotly work with Next.js.
export const Plot = dynamic(
    () => import('react-plotly.js'),
    {
        ssr: false
    }
)
