---
title: How a repeater listens while it talks
description: A ham radio repeater receives and retransmits at the same moment on frequencies only 600 kHz apart, and a set of tuned filters called a duplexer is what keeps its own transmitter from overloading its receiver.
pubDate: 2026-11-18
tag: Explainer
author: Signal Desk
---

Two handheld radios too far apart to hear each other can still talk through a repeater: a radio station [set up high, on a hill or mountain](https://www.hamradioschool.com/post/fm-repeaters-an-introduction), that picks up a weak signal and sends it out again at full strength. To do that, the repeater has to listen and transmit at the same moment, usually through one antenna.

## Input, output and offset

A repeater cannot transmit on the frequency it is listening to. [It would simply hear itself](https://qsl.net/kb8qeu/ham/repeater101.htm). So each repeater works on a pair of frequencies. It receives on its input and retransmits on its output, and the gap between the two is the offset. On the 2-meter amateur band [a common offset is 600 kHz](https://www.hamradioschool.com/articles/repeater-offsets-in-2-meter-band-t2a01.html). By the usual US convention, a 2-meter repeater with an output below 147 MHz [listens 600 kHz lower](https://qsl.net/kb8qeu/ham/repeater101.htm), though local listings have exceptions. GMRS, the licensed family radio service, uses a wider split: each of its eight 467 MHz channels, which radios use to reach a repeater, sits [exactly 5 MHz above](https://www.law.cornell.edu/cfr/text/47/95.1763) one of the eight 462 MHz main channels.

The Calaveras Amateur Radio Society's [N6FRG repeater](http://calaverasars.org/Web) is listed at 145.170 MHz with a negative offset and a 100 Hz tone. A handheld programmed for it listens on the output and switches to the input each time its owner keys the microphone. The tone is a low-pitched signal sent under the voice, the same kind sold as a ["privacy code" on FRS and GMRS radios](/news/2026-10-12-radio-privacy-codes). The repeater ignores anything that doesn't carry it, which keeps out [interference and unwanted signals](https://qsl.net/kb8qeu/ham/repeater101.htm).

## Why 600 kHz is close

At 145 MHz, 600 kHz is less than half of one percent of the frequency. The repeater's transmitter puts out watts beside a receiver built to pick up handhelds miles away, and it degrades that receiver in [two separate ways](https://vk6uu.id.au/Repeater-desensing.html). Any transmitter puts out a little noise on either side of its carrier, and at amateur repeater spacing that noise lands right on the receive frequency. The carrier itself can also overload the receiver's first stages and push them out of their linear range. Either way the receiver loses sensitivity. Operators call this ["de-sense"](https://qsl.net/kb8qeu/ham/repeater101.htm).

The fix is isolation between transmitter and receiver, measured in decibels. One repeater builder [puts the typical requirement at 100 dB](https://vk6uu.id.au/Repeater-desensing.html), and a UK club gives [about 90 dB](https://g4nsj.co.uk/gb3rw-two-metre-repeater-worthing/) for full sensitivity at 600 kHz spacing. Every 10 dB is a factor of ten in power, so 100 dB is a factor of ten billion. Separate antennas spaced far enough apart can provide it, but that arrangement is [less common](https://www.hamradioschool.com/post/fm-repeaters-an-introduction) than a duplexer.

## What a duplexer is

A duplexer is a [set of resonant circuits that act as a very sharp filter](https://www.hamradioschool.com/post/fm-repeaters-an-introduction), letting the receiver and transmitter share one antenna. Each circuit is a cavity: a metal can with a tuned conductor inside, about a quarter-wavelength long. The UK club's 2-meter duplexer uses [six of them](https://g4nsj.co.uk/gb3rw-two-metre-repeater-worthing/), three on the receive side and three on the transmit side.

In a notch duplexer the two sides are tuned against each other. The [transmitter side is tuned to the receive frequency](https://www.repeater-builder.com/antenna/notch-duplexer-tuning.html) and notches out the transmitter's noise there. The receiver side is tuned to the transmit frequency and notches the carrier. The filtering costs a little signal: a properly tuned four-section unit loses about 1 dB on the intended frequency. Bandpass designs, which pass only the wanted band instead of blocking one frequency, are [preferred at sites where several systems share antennas](https://en.wikipedia.org/wiki/Duplexer).

## Getting on the N6FRG repeater

Listening to the N6FRG repeater takes only a receiver. Transmitting through it on 2 meters takes an [amateur radio license](https://www.fcc.gov/wireless/bureau-divisions/mobility-division/amateur-radio-service), plus the three settings from the club's listing: 145.170 MHz, the negative offset, and the 100 Hz tone.
