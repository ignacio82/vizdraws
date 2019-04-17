#' @title IMPosterior
#'
#' @param x draws from the the posterior
#' @param MME minimum meaninful effect
#' @param threshold if the probability is greater than this threshold, you would feel confortable making a decision
#' @param units the units of x. For example, dollars or applications
#' @param colors colors for the left, middle, and right areas. The defaults are c("#e41a1c", "#377eb8", "#4daf4a")
#' @param width width for shiny
#' @param height height for shiny
#' @param elementId elementID for shiny
#'
#' @return
#' @export
#'
#' @examples
#' if(interactive()){
#' set.seed(9782)
#' x <- rnorm(1000)
#' library(IMPosterior)
#' IMPosterior(x= x, MME=1)
#'  }

IMPosterior <- function(x, MME = 0, threshold = 0.75, units = NULL,
                        colors,
                        width = NULL, height = NULL,
                        elementId = NULL) {
  if(MME<0) stop("MME should be greater than 0")
  if(threshold<=0 | threshold>=1) stop("threshold should be between 0 and 1")
  # Set colors

  if(missing(colors)){
    colors <- c("#e41a1c", "#377eb8", "#4daf4a")
  }

  # Calculate the breaks

  breaks <- if(MME!=0){
    c(-Inf, -MME, MME, Inf)
  }else c(-Inf, MME, Inf)

  # Calculate density values for input data
  dens <- data.frame(stats::density(x, n=2^10, adjust=1)[c("x","y")]) %>%
    dplyr::mutate(section = cut(x, breaks=breaks)) %>%
    dplyr::group_by(section) %>%
    dplyr::mutate(prob = paste0(round(sum(y)*mean(diff(x))*100),"%"))

  # Get probability mass for each level of section
  sp <- dens %>%
    dplyr::group_by(section, prob) %>%
    dplyr::summarise() %>%
    dplyr::ungroup() %>%
    tidyr::complete(section, fill=list(prob="0%"))

  # Gen text
  if(is.null(units)){
    left <-  glue::glue('Your data suggest that there is a {sp$prob[[1]]} probability that the intervention has a negative effect of {MME} or more.')
    if(MME!=0){
      middle <-  glue::glue('Your data suggest that there is a {sp$prob[[2]]} probability that the effect of the intervention between -{MME} and {MME}, which is considered negligible')
      right <-  glue::glue('Your data suggest that there is a {sp$prob[[3]]} probability that the intervention has a positive effect of {MME} or more.')
      text <- c(left, middle, right)
    }else{
      right <-  glue::glue('Your data suggest that there is a {sp$prob[[2]]} probability that the intervention has a positive effect of {MME} or more.')
      text <- c(left, right)
    }
  }else{
    left <-  glue::glue('Your data suggest that there is a {sp$prob[[1]]} probability that the intervention has a negative effect of {MME} {units} or more.')
    if(MME!=0){
      middle <-  glue::glue('Your data suggest that there is a {sp$prob[[2]]} probability that the effect of the intervention between -{MME} and {MME} {units}, which is considered negligible')
      right <-  glue::glue('Your data suggest that there is a {sp$prob[[3]]} probability that the intervention has a positive effect of {MME} {units} or more.')
      text <- c(left, middle, right)
    }else{
      right <-  glue::glue('Your data suggest that there is a {sp$prob[[2]]} probability that the intervention has a positive effect of {MME} {units} or more.')
      text <- c(left, right)
    }
  }



  if(MME!=0){
    bars <- data.frame(y = as.numeric(sub("%", "", sp$prob))/100,
                       x = c("Worse", "Equivalent", "Better"),
                       color = colors)
  }else{
    bars <- data.frame(y = as.numeric(sub("%", "", sp$prob))/100,
                       x = c("Worse", "Better"),
                       color = c(colors[1], colors[3]))
  }



  # forward options using x
  opts = list(
    data = dataframeToD3(data.frame(x = dens$x, y = dens$y)),
    MME = MME,
    threshold = threshold,
    prob = sp$prob,
    colors = colors,
    bars = dataframeToD3(bars),
    text = text
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'IMPosterior',
    opts,
    width = width,
    height = height,
    package = 'IMPosterior',
    elementId = elementId
  )
}

#' Shiny bindings for IMPosterior
#'
#' Output and render functions for using IMPosterior within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a IMPosterior
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name IMPosterior-shiny
#'
#' @export
IMPosteriorOutput <- function(outputId, width = '100%', height = '400px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'IMPosterior', width, height, package = 'IMPosterior')
}

#' @rdname IMPosterior-shiny
#' @export
renderIMPosterior <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, IMPosteriorOutput, env, quoted = TRUE)
}
