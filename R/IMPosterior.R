#' @title IMPosterior
#' @param prior draws from the prior distribution. This is an optional parameter but either this or posterior should be provided.
#' @param posterior draws from the posterior distribution. This is an optional parameter but either this or prior should be provided.
#' @param MME minimum meaninful effect. If not provided MME is set to zero.
#' @param threshold if the probability is greater than this threshold, you would feel confortable making a decision
#' @param units optional arguement to specify the units of x. For example, dollars or applications.
#' @param colors colors for the left, middle, and right areas. The defaults are c("#e41a1c", "#377eb8", "#4daf4a")
#' @param width width for shiny
#' @param height height for shiny
#' @param elementId elementID for shiny
#' @return htmlwidget
#' @export
#' @examples
#' if(interactive()){
#' set.seed(9782)
#' library(IMPosterior)
#' IMPosterior(prior= rnorm(100000))
#'  }

IMPosterior <- function(prior = NULL, posterior = NULL, MME = 0, threshold = NULL, units = NULL,
                        breaks=NULL, break_names = NULL, colors = NULL,
                        width = NULL, height = NULL,
                        elementId = NULL) {
  if(MME<0) stop("MME should be greater than 0")
  if (!is.null(breaks) & MME!=0) stop('MME and breaks cannot both be specified')
  if (length(breaks)>9) stop('Can\'t specicfy more than 9 breaks')
  if (!is.null(breaks) & is.null(break_names)) stop('Need break_names if specifying option breaks')
  if (!is.null(breaks) & !is.null(break_names) & length(break_names)<=length(breaks)) stop('Not enough break_names specified')
  if (!is.null(breaks) & !is.null(colors) & length(colors)<=length(breaks)) stop('Not enough colors specified')

  if(is.null(threshold)) {
    allow_threshold <- FALSE
  } else if((threshold<=0 | threshold>=1)) {
    stop("threshold should be between 0 and 1")
  } else {
    allow_threshold <- TRUE
  }

  if(is.null(prior) & is.null(posterior)) stop("must specify at least one of prior or posterior")
  if(is.null(prior) | is.null(posterior)) allow_mode_trans <- FALSE
  else allow_mode_trans <- TRUE

  # Calculate the breaks
  if(is.null(breaks)) {
    breaks <- if(MME!=0){
      c(-MME, MME)
    }else 0
  }

  if(missing(colors)){
    colors <- c('#e41a1c', '#377eb8', '#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf','#999999')
  }

  #Start graph showing prior, unless it's not provided
  start <- ifelse(is.null(prior),'posterior','prior')

  #If only one was provided, duplicate it for the other
  #That way we can be sure they'll have the same range etc
  data = list(prior=prior, posterior=posterior)
  if (is.null(prior)) data$prior = posterior
  if (is.null(posterior)) data$posterior = prior

  n_dens <- 2^11
  # Figure out range of densities
  rng <- lapply(data, function(d){
    data.frame(stats::density(d, n=n_dens, adjust=1)[c("x","y")]) %>%
      dplyr::summarize(xmin = min(x),
                xmax = max(x))
  })
  xmin <- min(rng$prior, rng$posterior)
  xmax <- max(rng$prior, rng$posterior)
  # Calculate density values for input data
  dens <- lapply(data, function(d) {
    data.frame(stats::density(d, n=n_dens, adjust=1, from=xmin, to=xmax)[c("x","y")])
  })

  # forward options using x
  opts = list(
    dens = dataframeToD3(data.frame(x = dens$prior$x,
                                    y_prior = dens$prior$y,
                                    y_posterior = dens$posterior$y)),
    prior = dataframeToD3(data.frame(x = data$prior)),
    posterior = dataframeToD3(data.frame(x = data$posterior)),
    breaks = breaks,
    break_names = break_names,
    colors = colors,
    allow_threshold = allow_threshold,
    threshold = threshold,
    start_mode = start,
    start_status = 'distribution',
    initial_trans = TRUE,
    allow_mode_trans = allow_mode_trans
  )

  # Define sizing policy
  sizingPolicy = htmlwidgets::sizingPolicy(
    defaultWidth = 400,
    defaultHeight = 400,
    browser.fill = TRUE
  )
  # create widget
  htmlwidgets::createWidget(
    name = 'IMPosterior',
    opts,
    width = width,
    height = height,
    package = 'IMPosterior',
    elementId = elementId,
    sizingPolicy = sizingPolicy
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
IMPosteriorOutput <- function(outputId, width = '100%', height = '100%'){
  htmlwidgets::shinyWidgetOutput(outputId, 'IMPosterior', width, height, package = 'IMPosterior')
}

#' @rdname IMPosterior-shiny
#' @export
renderIMPosterior <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, IMPosteriorOutput, env, quoted = TRUE)
}
