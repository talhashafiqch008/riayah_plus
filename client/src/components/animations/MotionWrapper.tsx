import type { ComponentType } from 'react';
import { motion, AnimatePresence as FramerAnimatePresence } from 'framer-motion';
import type { HTMLMotionProps, SVGMotionProps, AnimatePresenceProps } from 'framer-motion';

export const MotionDiv = motion.div as ComponentType<HTMLMotionProps<'div'>>;
export const MotionHeader = motion.header as ComponentType<HTMLMotionProps<'header'>>;
export const MotionSection = motion.section as ComponentType<HTMLMotionProps<'section'>>;
export const MotionFooter = motion.footer as ComponentType<HTMLMotionProps<'footer'>>;
export const MotionH1 = motion.h1 as ComponentType<HTMLMotionProps<'h1'>>;
export const MotionH2 = motion.h2 as ComponentType<HTMLMotionProps<'h2'>>;
export const MotionH3 = motion.h3 as ComponentType<HTMLMotionProps<'h3'>>;
export const MotionP = motion.p as ComponentType<HTMLMotionProps<'p'>>;
export const MotionSpan = motion.span as ComponentType<HTMLMotionProps<'span'>>;
export const MotionUl = motion.ul as ComponentType<HTMLMotionProps<'ul'>>;
export const MotionLi = motion.li as ComponentType<HTMLMotionProps<'li'>>;
export const MotionButton = motion.button as ComponentType<HTMLMotionProps<'button'>>;
export const MotionA = motion.a as ComponentType<HTMLMotionProps<'a'>>;
export const MotionNav = motion.nav as ComponentType<HTMLMotionProps<'nav'>>;
export const MotionArticle = motion.article as ComponentType<HTMLMotionProps<'article'>>;
export const MotionMain = motion.main as ComponentType<HTMLMotionProps<'main'>>;
export const MotionAside = motion.aside as ComponentType<HTMLMotionProps<'aside'>>;
export const MotionForm = motion.form as ComponentType<HTMLMotionProps<'form'>>;
export const MotionInput = motion.input as ComponentType<HTMLMotionProps<'input'>>;
export const MotionLabel = motion.label as ComponentType<HTMLMotionProps<'label'>>;
export const MotionImg = motion.img as ComponentType<HTMLMotionProps<'img'>>;
export const MotionVideo = motion.video as ComponentType<HTMLMotionProps<'video'>>;

export const MotionSvg = motion.svg as ComponentType<SVGMotionProps<SVGSVGElement>>;
export const MotionCircle = motion.circle as ComponentType<SVGMotionProps<SVGCircleElement>>;
export const MotionPath = motion.path as ComponentType<SVGMotionProps<SVGPathElement>>;
export const MotionRect = motion.rect as ComponentType<SVGMotionProps<SVGRectElement>>;
export const MotionLine = motion.line as ComponentType<SVGMotionProps<SVGLineElement>>;
export const MotionPolyline = motion.polyline as ComponentType<SVGMotionProps<SVGPolylineElement>>;
export const MotionPolygon = motion.polygon as ComponentType<SVGMotionProps<SVGPolygonElement>>;
export const MotionG = motion.g as ComponentType<SVGMotionProps<SVGGElement>>;

export const AnimatePresence = FramerAnimatePresence as ComponentType<AnimatePresenceProps>;
