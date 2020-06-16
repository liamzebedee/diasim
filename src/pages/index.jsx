import { ThemeProvider, CSSReset } from "@chakra-ui/core";
import { Experiment } from '../components/Experiment'

export default () => {
    return <ThemeProvider>
        <CSSReset/>
        <Experiment />
    </ThemeProvider>
}