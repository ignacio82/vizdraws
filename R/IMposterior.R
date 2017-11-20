#' <Add Title>
#'
#' <Add Description>
#'
#' @import htmlwidgets
#' @importFrom magrittr "%>%"
#'
#' @export
IMposterior <- function(x, MME = 0, threshold = 0.75, colors,
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



  # forward options using x
  opts = list(
    data = dataframeToD3(data.frame(x = dens$x, y = dens$y)),
    MME = MME,
    threshold = threshold,
    prob = sp$prob,
    colors = colors
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'IMposterior',
    opts,
    width = width,
    height = height,
    package = 'IMposterior',
    elementId = elementId
  )
}

#' Shiny bindings for IMposterior
#'
#' Output and render functions for using IMposterior within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a IMposterior
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name IMposterior-shiny
#'
#' @export
IMposteriorOutput <- function(outputId, width = '100%', height = '400px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'IMposterior', width, height, package = 'IMposterior')
}

#' @rdname IMposterior-shiny
#' @export
renderIMposterior <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, IMposteriorOutput, env, quoted = TRUE)
}
