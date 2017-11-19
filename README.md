<!-- README.md is generated from README.Rmd. Please edit that file -->
IMposterior
===========

The goal of IMposterior is to ...

Example
-------

This is a basic example which shows you how to solve a common problem:

``` r
library(IMposterior)
set.seed(9782)
x <- rnorm(1000)
IMposterior(x= x, MME=1)
```

![Posterior distribution](./posterior.png)
