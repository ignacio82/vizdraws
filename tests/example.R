# Gen data --------------------------------------------------------------
set.seed(9782)
x <- rnorm(1000)


# Usy my widget -----------------------------------------------------------
library(IMPosterior)
IMPosterior(x= x, MME=1)



