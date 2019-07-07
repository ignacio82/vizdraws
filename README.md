<!-- README.md is generated from README.Rmd. Please edit that file -->
vizdraws
========

**vizdraws** creates interactive visualizations using draws from a prior
and posterior distributions.

Installation
------------

``` r
install.packages('vizdraws')
```

The latest development version can be installed from github:

``` r
# install.packages("remotes")
remotes::install_github('ignacio82/vizdraws')
```

Example
-------

This is a example which shows you how to how to visualize the transition
from the prior to the posterior:

``` r
library(vizdraws)
set.seed(9782)
vizdraws(prior = rnorm(10000, 0, 1), posterior = rnorm(10000, 1.1, 0.5), MME = 0.5, threshold = 0.8)
```

![](https://home.ignacio.website/Posterior.gif)

### Notes

The bell-curve icon was [created by Davo
Sime.](https://thenounproject.com/term/bell-curve/614251/)
