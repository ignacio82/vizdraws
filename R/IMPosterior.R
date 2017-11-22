#' <Add Title>
#'
#' <Add Description>
#'
#' @import htmlwidgets
#' @importFrom magrittr "%>%"
#'
#' @export
IMPosterior <- function(x, MME = 0, threshold = 0.75, colors,
                        width = NULL, height = NULL,
                        elementId = NULL) {
  # Set colors

  if(missing(colors)){
    colors <- c("#e41a1c", "#377eb8", "#4daf4a")
  }

  # Calculate the breaks

  breaks <- if(MME!=0){
    c(-Inf, -MME, MME, Inf)
  }else c(-Inf, MME, Inf)

  # Calculate density values for input data
  dens <- data.frame(density(x, n=2^10, adjust=1)[c("x","y")]) %>%
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
  left <-  glue::glue('Your data suggest that there is a {sp$prob[[1]]} probability that the intervention has a negative effect of {MME} or more.')
  if(MME!=0){
    middle <-  glue::glue('Your data suggest that there is a {sp$prob[[2]]} probability that the effect of the intervention between -{MME} and {MME}, which we consider negligible')
    right <-  glue::glue('Your data suggest that there is a {sp$prob[[3]]} probability that the intervention has a positive effect of {MME} or more.')
    text <- c(left, middle, right)
  }else{
    right <-  glue::glue('Your data suggest that there is a {sp$prob[[2]]} probability that the intervention has a positive effect of {MME} or more.')
    text <- c(left, right)
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
