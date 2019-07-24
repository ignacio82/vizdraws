parse_prior <- function(prior = NULL) {
  if (is.null(prior) | is.numeric(prior)) {
    return(prior)
  } else if (is.character(prior)) {
    prior <- stringr::str_to_lower(prior)
    #Check that it matches one of the distribution options
    valid_distns <- list(n = qnorm, normal = qnorm, unif = qunif, uniform = qunif, beta = qbeta, gamma = qgamma)
    #These take 2 options
    if (prior=='std_normal') {
      return(qnorm(1:1000/1001))
    } else if (stringr::str_detect(prior,'^(n|normal|unif|uniform|beta|gamma)\\(([-0-9.]+), ?([-0-9.]+)\\)$')) {
      matches <- stringr::str_match(prior,'^(n|normal|unif|uniform|beta|gamma)\\(([-0-9.]+), ?([-0-9.]+)\\)$')
      fxn <- valid_distns[[matches[,2]]]
      arg1 <- as.numeric(matches[,3])
      arg2 <- as.numeric(matches[,4])
      return(fxn(1:1000/1001, arg1, arg2))
    } else if (stringr::str_detect(prior,'^halfnormal\\(([-0-9.]+), ?([-0-9.]+)\\)$')) {
      matches <- stringr::str_match(prior,'^halfnormal\\(([-0-9.]+), ?([-0-9.]+)\\)$')
      arg1 <- as.numeric(matches[,2])
      arg2 <- as.numeric(matches[,3])
      return(qnorm(0.5 + 1:1000/2001, arg1, arg2))
    } else if (stringr::str_detect(prior,'^(t|student_t)\\(([-0-9.]+), ?([-0-9.]+), ?([-0-9.]+)\\)$')) {
      matches <- stringr::str_match(prior,'^(t|student_t)\\(([-0-9.]+), ?([-0-9.]+), ?([-0-9.]+)\\)$')
      arg1 <- as.numeric(matches[,3])
      arg2 <- as.numeric(matches[,4])
      arg3 <- as.numeric(matches[,5])
      return(qt(1:1000/1001, arg1, arg2, arg3))
    } else {
      stop('prior incorrectly specified. Valid distributions are std_normal, N, normal, halfnormal, unif, uniform, beta, gamma, t, and student_t.')
    }

  #They entered something but it's not NULL, string, or numeric. Error out.
  } else {
    stop('prior incorrectly specified.')
  }
}
