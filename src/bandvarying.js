import {
    range as sequence
} from "d3-array";
import ordinal from "./ordinal";

export default function band() {
    var scale = ordinal().unknown(undefined),
        domain = scale.domain,
        ordinalRange = scale.range,
        range = [0, 1],
        step,
        bandwidth,
        round = false,
        paddingInner = 0,
        paddingOuter = 0,
        align = 0.5,
        ratios = null;

    delete scale.unknown;

    function rescale() {
        if (ratios != null) return rescaleVarying();

        var n = domain().length,
            reverse = range[1] < range[0],
            start = range[reverse - 0],
            stop = range[1 - reverse];

        var totalLength = stop - start,
            innerPaddingStep = paddingInner * totalLength,
            outerPaddingStep = paddingOuter * totalLength;
        // length = baseLength - (n - 1) * innerPaddingStep - 2 * outerPaddingStep;

        var outerPaddingLength = outerPaddingStep * 2,
            innerPaddingLength = innerPaddingStep * (n - 1),
            barsLength = totalLength - outerPaddingLength - innerPaddingLength;

        // Ensure inner padding doesn't eat up more than 90% of the space
        if (barsLength < 0.1 * totalLength) {
            barsLength = 0.1 * totalLength;
            innerPaddingLength = totalLength - barsLength - outerPaddingLength;
            innerPaddingStep = innerPaddingLength / (n - 1);
        }

        step = barsLength / n;
        bandwidth = step + innerPaddingStep;

        var offset = start + outerPaddingStep + (innerPaddingStep / 2) - bandwidth * (align + 0.5),
            val;

        var values = sequence(n).map(function () {
            val = offset = offset + step;
            offset += innerPaddingStep;
            return Math.round(val);
        });

        return ordinalRange(reverse ? values.reverse() : values);
    }

    function rescaleVarying() {
        // console.log("DURR!")
        var n = domain().length,
            reverse = range[1] < range[0],
            start = range[reverse - 0],
            stop = range[1 - reverse];

        var ratioSum = 0,
            i,
            ratio,
            ratioCache = [];

        // Sum up the ratios
        for (i = 0; i < n; ++i) {
            ratio = ratioCache[i] = ratios(i);
            ratioSum += ratio;
        }

        // Normalize so that the sum is 1
        for (i = 0; i < n; ++i) {
            ratioCache[i] /= ratioSum;
        }

        var totalLength = stop - start,
            outerPaddingLength = paddingOuter * totalLength,
            innerLength = totalLength - outerPaddingLength,
            innerPaddingLength = n === 1 ? 0 : innerLength * paddingInner,
            innerPaddingStep = n === 1 ? 0 : innerPaddingLength / (n - 1),
            // innerPaddingStep = n === 1 ? 0 : paddingInner * totalLength / (n - 1),
            outerPaddingStep = outerPaddingLength / 2,
            barsLength = innerLength - innerPaddingLength - outerPaddingLength;

        // var outerPaddingLength = outerPaddingStep * 2,
        //     innerPaddingLength = n === 1 ? 0 : innerPaddingStep * (n - 1),
        //     barsLength = totalLength - outerPaddingLength - innerPaddingLength;


        // if (barsLength < 0.1 * totalLength) {
        //     barsLength = 0.1 * totalLength;
        //     innerPaddingLength = totalLength - barsLength - outerPaddingLength;
        //     innerPaddingStep = innerPaddingLength / (n - 1);
        // }

        function stepFunc(i) {
            return barsLength * ratioCache[i];
        }

        function bandwidthFunc(i) {
            return stepFunc(i) + innerPaddingStep;
        }

        var offset = start + (2 * outerPaddingStep) + (outerPaddingStep / n) - (innerPaddingStep/4) - (innerLength / (2 * n)); // - (bandwidthFunc(n - 1) - bandwidthFunc(0) / 2); // * (align);

        // console.log(`start ${start}, stop ${stop} (0): ${bandwidthFunc(0)}, (n-1): ${bandwidthFunc(n-1)}, outerPaddingStep: ${outerPaddingStep}, innerPaddingStep: ${innerPaddingStep}`);

        var values = [],
            myLength;

        // offset += stepFunc(0) / 4;
        for (i = 0; i < n; ++i) {
            myLength = stepFunc(i);
            values[i] = offset + myLength / 2;
            offset += innerPaddingStep + myLength;
            values[i] = Math.round(values[i]);
        }

        // hack to make varying step sizes work w/ axis as it is now without modifying it

        var ord = ordinalRange(reverse ? values.reverse() : values);
        return ord;

    }

    scale.ratios = function (_) {
        return arguments.length ? (ratios = _, rescale()) : ratios;
    }

    scale.domain = function (_) {
        return arguments.length ? (domain(_), rescale()) : domain();
    };

    scale.range = function (_) {
        return arguments.length ? (range = [+_[0], +_[1]], rescale()) : range.slice();
    };

    scale.rangeRound = function (_) {
        return range = [+_[0], +_[1]], round = true, rescale();
    };

    scale.bandwidth = function () {
        return ratios != null ? bandwidth : 0;
    };

    scale.step = function () {
        return step;
    };

    scale.round = function (_) {
        return arguments.length ? (round = !!_, rescale()) : round;
    };

    scale.padding = function (_) {
        return arguments.length ? (paddingInner = paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
    };

    scale.paddingInner = function (_) {
        return arguments.length ? (paddingInner = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
    };

    scale.paddingOuter = function (_) {
        return arguments.length ? (paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingOuter;
    };

    scale.align = function (_) {
        return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
    };

    scale.copy = function () {
        return band()
            .domain(domain())
            .range(range)
            .round(round)
            .paddingInner(paddingInner)
            .paddingOuter(paddingOuter)
            .align(align)
            .ratios(ratios);
    };

    return rescale();
}

function pointish(scale) {
    var copy = scale.copy;

    scale.padding = scale.paddingOuter;
    delete scale.paddingInner;
    delete scale.paddingOuter;

    scale.copy = function () {
        return pointish(copy());
    };

    return scale;
}

export function point() {
    return pointish(band().paddingInner(1));
}